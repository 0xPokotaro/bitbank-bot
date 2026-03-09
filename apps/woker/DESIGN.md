# apps/woker ボット DSL 設計ドキュメント

## 0. はじめに（Quick Start）

> **初めてこのドキュメントを読む方へ**

1. **ボットを動かしたいだけ** → Section 3「DSL の使用例」を読む
2. **Guard / Signal / Strategy を追加したい** → Section 8「プラグイン拡張ガイド」を読む
3. **型や設計を理解したい** → Section 4〜5 を読む
4. **取引所を追加したい** → Section 8「新しい取引所の追加」を読む

### 用語早見表

| 用語 | 一言説明 |
|------|---------|
| Guard | 「取引できる状態か？」をチェックする関門。1つでも NG なら中断 |
| Signal | 「今エントリーすべきか？」を判断する。どれか1つが発火したら実行 |
| Strategy | 「どう注文するか？」を決める。発注 API を呼び出す |
| MarketContext | 市場データ（価格・残高・指標）を提供するオブジェクト |
| ExchangeAdapter | 取引所 API を抽象化するアダプター。DSL 側は取引所を意識しない |
| Pipeline | Guard → Signal → Strategy の実行チェーン全体 |

---

## 1. 概要・設計目標

`apps/woker` は AWS Lambda 上で動く取引ボット。1分ごとに EventBridge で起動し、`run()` が呼ばれるたびに市場状態を評価して発注を行う。

### 設計目標

| 目標 | 詳細 |
|------|------|
| 宣言的 DSL | チェーンメソッドで取引ロジックを直感的に記述できる |
| 設定オブジェクト渡し | コールバックではなく `{ type: SignalType.Rsi, threshold: 30 }` 形式 |
| 複数チェーン | `.guard(a).guard(b)`, `.signal(a).signal(b)`, `.strategy(a).strategy(b)` すべて可 |
| 記述順 = 実行順 | DSL の書き順がそのままパイプラインの実行順になる |
| 型安全な順序強制 | TypeScript の型システムで `guard → signal → strategy` の順序を強制 |
| 市場種別の型安全 | `market` の型を推論し、使えるConfig を市場種別ごとに型レベルで制限する |
| シンプルなエントリポイント | `bot({ pair: 'btc_jpy', market: Market.Spot })` で開始 |
| CEX 選択可能 | `exchange` フィールドで取引所を切り替え。アダプター経由で抽象化し、DSL 側に取引所固有コードを持ち込まない |

---

## 2. アーキテクチャ概要

### 3層構造

```
┌────────────────────────────────────────────────────────┐
│  DSL 層（公開 API）                                      │
│  bot() / GuardBuilder / SignalBuilder / StrategyBuilder  │
│  BotConfig / GuardConfig / SignalConfig / StrategyConfig │
│  BotResult / Order                                       │
├────────────────────────────────────────────────────────┤
│  実行エンジン層（内部実装・ユーザーは触らない）             │
│  MarketContext / guard-runner / signal-runner            │
│  strategy-runner                                         │
├────────────────────────────────────────────────────────┤
│  プラグイン層（拡張ポイント）                              │
│  ロジック拡張: GuardHandler / SignalHandler / StrategyHandler │
│  取引所拡張:   ExchangeAdapter の実装（exchanges/{name}/）   │
└────────────────────────────────────────────────────────┘
```

### 境界の定義

- **DSL → エンジン**: `run()` が収集済み configs をパイプラインに渡す
- **エンジン → プラグイン**: runner が `config.type` で dispatch しハンドラーを呼ぶ
- **プラグイン → エンジン**: ハンドラーは `MarketContext` と `ExchangeAdapter` を受け取る

### コンポーネント責務定義

#### Market Context（データ層）

**「実行時点の市場状態を提供する」**

- `ExchangeAdapter` 経由で各 CEX の API を呼び出し、生データを取得・保持する
- Guard / Signal / Strategy はすべて Context 経由でデータにアクセスする（取引所を意識しない）
- **取得戦略**: context 構築時に ticker / ohlcv 等の生データを並列で一括取得する。指標計算（RSI, MACD 等）はシグナル評価時に初回要求があったときに実行し、結果をキャッシュする（Lazy 評価）。
- **Context 自身は何も判断しない。データを渡すだけ。**

取得するデータ：

| データ | 市場 | 用途 |
|--------|------|------|
| `ticker` | 共通 | 現在価格、スプレッド |
| `orderbook` | 共通 | 板情報 |
| `ohlcv` | 共通 | RSI / MACD 等の指標計算 |
| `openOrders` | 共通 | グリッド等のポジション管理（`BotConfig.pair` で指定したペアの未約定注文のみ取得） |
| `balance` | 共通 | 残高チェック（Guard で使用） |
| `positions` | デリバティブ | 建玉（ロング/ショート） |
| `fundingRate` | デリバティブ | ファンディングレート |
| `marginRatio` | デリバティブ | 証拠金維持率 |

---

#### Guard（実行可否チェック層）

**「今、取引を実行できる環境か？」**

- 市場・口座の **健全性** を確認する
- Signal や Strategy の内容に関係なく、条件を満たさなければ全体を中断する
- **AND 条件**（1つでも失敗 → 以降の処理なし）
- Guard が「NO」なら、Signal が何を言っても取引しない

---

#### Signal（エントリー判断層）

**「今、このタイミングで取引すべきか？」**

- テクニカル指標や価格条件から **エントリータイミング** を判断する
- Guard が通過した後にのみ評価される
- **OR 条件**（どれか1つ発火 → Strategy を実行）
- Signal は「取引できるか」には関心を持たない。「今か？」だけを判断する

---

#### Strategy（実行層）

**「どのように注文するか？」**

- Signal が発火した後にのみ実行される
- 注文の種類・量・価格を計算し、API に発注する
- 複数定義された場合は **順番に全て実行する**（1つが失敗しても後続の実行を継続し、エラーを `BotResult.errors` に追記する）
- Strategy は「いつ実行するか」には関心を持たない。「どう発注するか」だけを担う

---

## 3. DSL の使用例

### 現物（Spot）

```typescript
await bot({ pair: 'btc_jpy', market: Market.Spot })
  .guard({ type: GuardType.Spread, max: 0.5 })
  .guard({ type: GuardType.Volume, min: 1000 })
  .signal({ type: SignalType.Rsi, period: 14, threshold: 30, direction: 'below' })
  .strategy({ type: StrategyType.MarketBuy, amount: 1000 })
  .run()
```

### デリバティブ（Perpetual）

```typescript
await bot({ pair: 'btc_jpy_perp', market: Market.Perpetual })
  .guard({ type: GuardType.MarginRatio, min: 20 })
  .guard({ type: GuardType.FundingRateLimit, max: 0.01 })
  .signal({ type: SignalType.Rsi, period: 14, threshold: 30, direction: 'below' })
  .signal({ type: SignalType.FundingRate, threshold: 0.005, direction: 'below' })
  .strategy({ type: StrategyType.OpenLong, amount: 0.01, leverage: 5 })
  .run()
```

### 時間帯 Guard + DCA（現物）

```typescript
// time Guard で「毎日09:00〜09:01 のみ実行」を表現し、DCA の頻度を制御する
await bot({ pair: 'btc_jpy', market: Market.Spot })
  .guard({ type: GuardType.Time, start: '09:00', end: '09:01', timezone: 'Asia/Tokyo' })
  .signal({ type: SignalType.Always })
  .strategy({ type: StrategyType.Dca, amount: 10000 })
  .run()
```

### グリッド戦略（現物）

```typescript
// 1分ごとに openOrders を確認し、約定済みレベルに次の指値を発注
await bot({ pair: 'btc_jpy', market: Market.Spot })
  .guard({ type: GuardType.Spread, max: 0.3 })
  .signal({ type: SignalType.Always })
  .strategy({ type: StrategyType.Grid, levels: 5, rangePercent: 5, amount: 1000 })
  .run()
```

### 型レベルで弾かれるパターン

```typescript
// ❌ spot で derivatives 専用の Strategy はコンパイルエラー
bot({ pair: 'btc_jpy', market: Market.Spot })
  .signal({ type: SignalType.Always })
  .strategy({ type: StrategyType.OpenLong, amount: 0.01 }) // Type error

// ❌ perpetual で spot 専用の Strategy はコンパイルエラー
bot({ pair: 'btc_perp', market: Market.Perpetual })
  .guard({ type: GuardType.MarginRatio, min: 20 })
  .signal({ type: SignalType.FundingRate, threshold: 0.01, direction: 'below' })
  .strategy({ type: StrategyType.MarketBuy, amount: 1000 }) // Type error: MarketBuy は SpotStrategyConfig
```

---

## 4. DSL 層の型定義

ユーザーが直接触る公開 API 型。DSL の記述に必要な型のみを定義する。

### 4-1. 取引所・市場種別

```typescript
// 対応取引所の識別子。随時追加予定
enum Exchange {
  Bitbank = 'bitbank',
}

// 市場種別。bot() の market フィールドに渡す
enum Market {
  Spot      = 'spot',
  Perpetual = 'perpetual',
  Futures   = 'futures',
}
```

### 4-2. ビルダーインターフェース（ジェネリクスで市場種別を伝播）

`bot()` が `market` の型 `M` を推論し、以降のビルダー全体に伝播する。
各ビルダーの Config は `M` によって使える型が変わる。

```typescript
function bot<M extends Market>(config: BotConfig<M>): GuardBuilder<M>

interface GuardBuilder<M extends Market> {
  guard(config: GuardConfig<M>): GuardBuilder<M>
  signal(config: SignalConfig<M>): SignalBuilder<M>
}

interface SignalBuilder<M extends Market> {
  signal(config: SignalConfig<M>): SignalBuilder<M>
  strategy(config: StrategyConfig<M>): StrategyBuilder<M>
}

interface StrategyBuilder<M extends Market> {
  strategy(config: StrategyConfig<M>): StrategyBuilder<M>
  run(): Promise<BotResult>
}
```

### 4-3. BotConfig

```typescript
interface BotConfig<M extends Market = Market> {
  exchange?: Exchange  // デフォルト: Exchange.Bitbank
  pair: string
  market: M
  apiKey?: string      // 省略時は process.env.{EXCHANGE}_API_KEY（例: BITBANK_API_KEY）
  apiSecret?: string   // 省略時は process.env.{EXCHANGE}_API_SECRET
}
```

### 4-4. GuardConfig

まず各 Guard の識別子 `type` を enum で定義する：

```typescript
enum GuardType {
  Spread           = 'spread',
  Volume           = 'volume',
  Time             = 'time',
  Balance          = 'balance',
  MarginRatio      = 'margin-ratio',
  FundingRateLimit = 'funding-rate-limit',
}
```

```typescript
// 共通（spot・derivatives 両方で使える）
type CommonGuardConfig =
  | { type: GuardType.Spread;  max: number }
  | { type: GuardType.Volume;  min: number }
  | { type: GuardType.Time;    start: string; end: string; timezone?: string }  // デフォルト: 'Asia/Tokyo'
  | { type: GuardType.Balance; min: number; currency: 'jpy' | 'base' }
  // base = ペアの基軸通貨（btc_jpy なら BTC）

// デリバティブ専用
// perpetual: 無期限先物。ファンディングレートあり
// futures:   期限付き先物。満期あり、ファンディングレートなし（FundingRateLimit Guard は使用不可）
type DerivativesGuardConfig =
  | { type: GuardType.MarginRatio;      min: number }  // 証拠金維持率が min% 以上か
  | { type: GuardType.FundingRateLimit; max: number }  // ファンディングレートが max% 以下か（perpetual のみ有効）

type GuardConfig<M extends Market> =
  M extends Market.Spot
    ? CommonGuardConfig
    : M extends Market.Perpetual
      ? CommonGuardConfig | DerivativesGuardConfig
      // → futures は期限付き先物のためファンディングレートがない。
      //   Exclude で FundingRateLimit Guard を除外する。
      : CommonGuardConfig | Exclude<DerivativesGuardConfig, { type: GuardType.FundingRateLimit }>
```

### 4-5. SignalConfig

まず各 Signal の識別子 `type` を enum で定義する：

```typescript
enum SignalType {
  Rsi          = 'rsi',
  Macd         = 'macd',
  Price        = 'price',
  Always       = 'always',
  FundingRate  = 'funding-rate',
  OpenInterest = 'open-interest',
}
```

```typescript
// 共通
type CommonSignalConfig =
  | { type: SignalType.Rsi;   period?: number; threshold: number; direction: 'above' | 'below' }
  | { type: SignalType.Macd;  fast?: number; slow?: number; signal?: number; direction: 'golden-cross' | 'dead-cross' }
  | { type: SignalType.Price; above?: number; below?: number }  // 少なくとも一方を指定すること。両方 undefined の場合は実装時にバリデーションエラーとする
  | { type: SignalType.Always }

// デリバティブ専用
type DerivativesSignalConfig =
  | { type: SignalType.FundingRate;  threshold: number; direction: 'above' | 'below' }
  | { type: SignalType.OpenInterest; threshold: number; direction: 'above' | 'below' }

type SignalConfig<M extends Market> =
  M extends Market.Spot
    ? CommonSignalConfig
    : CommonSignalConfig | DerivativesSignalConfig
```

### 4-6. StrategyConfig

まず各 Strategy の識別子 `type` を enum で定義する：

```typescript
enum StrategyType {
  MarketBuy  = 'market-buy',
  MarketSell = 'market-sell',
  LimitBuy   = 'limit-buy',
  LimitSell  = 'limit-sell',
  Dca        = 'dca',
  Grid       = 'grid',
  OpenLong   = 'open-long',
  OpenShort  = 'open-short',
  CloseLong  = 'close-long',
  CloseShort = 'close-short',
}
```

```typescript
// 現物専用
type SpotStrategyConfig =
  | { type: StrategyType.MarketBuy;  amount: number }
  | { type: StrategyType.MarketSell; amount: number }
  | { type: StrategyType.LimitBuy;   amount: number; price: number }
  | { type: StrategyType.LimitSell;  amount: number; price: number }
  | { type: StrategyType.Dca;        amount: number }
  | { type: StrategyType.Grid;       levels: number; rangePercent: number; amount: number }
  // rangePercent: グリッドの価格幅（現在価格に対する%）

// デリバティブ専用
type DerivativesStrategyConfig =
  | { type: StrategyType.OpenLong;   amount: number; leverage?: number }
  | { type: StrategyType.OpenShort;  amount: number; leverage?: number }
  | { type: StrategyType.CloseLong;  amount: number | 'all' }
  | { type: StrategyType.CloseShort; amount: number | 'all' }

type StrategyConfig<M extends Market> =
  M extends Market.Spot
    ? SpotStrategyConfig
    : DerivativesStrategyConfig
```

### 4-7. BotResult / Order

```typescript
interface BotResult {
  passed: boolean      // ガードが全て通ったか
  triggered: boolean   // いずれかのシグナルが発火したか
  executed: boolean    // ストラテジーを実行したか
  orders?: Order[]
  errors?: Error[]
}

interface Order {
  orderId: string
  pair: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  amount: number
  price?: number
  leverage?: number          // デリバティブのみ
  positionSide?: 'long' | 'short'  // デリバティブのみ
  status: 'filled' | 'unfilled' | 'partially_filled'
}
```

---

## 5. 実行エンジン層の型定義

エンジン内部の型。ユーザーは直接触らない。プラグイン実装者（ハンドラー追加時）のみ参照する。

### 5-1. ExchangeAdapter

取引所ごとの実装が `ExchangeAdapter` を実装し、pipeline 層に注入される。
DSL / Guard / Signal / Strategy は取引所を意識しない。

```typescript
interface ExchangeAdapter {
  // データ取得（共通）
  fetchTicker(pair: string): Promise<Ticker>
  fetchOrderbook(pair: string): Promise<Orderbook>
  fetchOhlcv(pair: string, timeframe: string): Promise<Ohlcv[]>
  fetchOpenOrders(pair: string): Promise<OpenOrder[]>
  fetchBalance(): Promise<Balance>

  // データ取得（デリバティブのみ）
  fetchPositions?(pair: string): Promise<Position[]>
  fetchFundingRate?(pair: string): Promise<FundingRate>
  fetchMarginRatio?(): Promise<number>

  // 発注
  placeOrder(params: OrderParams): Promise<Order>
  cancelOrder(orderId: string, pair: string): Promise<void>
}

// BotConfig.exchange と apiKey/apiSecret を受け取りアダプターを生成するファクトリ
function createExchangeAdapter(config: BotConfig): ExchangeAdapter
```

### 5-2. MarketContext

runner がハンドラーに渡す、取引所抽象化済みのデータアクセスインターフェース。

```typescript
interface MarketContext<M extends Market> {
  pair: string
  ticker(): Promise<Ticker>
  orderbook(): Promise<Orderbook>
  ohlcv(timeframe?: string): Promise<Ohlcv[]>
  openOrders(): Promise<OpenOrder[]>
  balance(): Promise<Balance>
  // derivatives のみ有効。
  // spot で呼び出すと never 型になりコンパイルエラーになる（意図的な型ガード）
  positions:   M extends Market.Spot ? never : () => Promise<Position[]>
  fundingRate: M extends Market.Spot ? never : () => Promise<FundingRate>
  marginRatio: M extends Market.Spot ? never : () => Promise<number>
  // 指標（Lazy 評価・結果をキャッシュ）
  rsi(period?: number): Promise<number>
  macd(fast?: number, slow?: number, signal?: number): Promise<MacdResult>
}
```

### 5-3. ハンドラー型（エンジン↔プラグイン境界）

runner は `config.type` でハンドラーを dispatch し、以下の型契約でハンドラーを呼び出す。

```typescript
type GuardHandler<C, M extends Market = Market> =
  (config: C, ctx: MarketContext<M>) => Promise<boolean>

type SignalHandler<C, M extends Market = Market> =
  (config: C, ctx: MarketContext<M>) => Promise<boolean>

type StrategyHandler<C, M extends Market = Market> =
  (config: C, ctx: MarketContext<M>, adapter: ExchangeAdapter) => Promise<Order[]>
```

デフォルト `M = Market` により、市場非依存のハンドラーは `GuardHandler<Config>` とシンプルに書ける。

---

## 6. ファイル構成

```
apps/woker/
  src/
    index.ts                    ← Lambda ハンドラ
    local.ts                    ← ローカル開発スケジューラ（変更なし）
    bot/
      index.ts                  ← barrel export
      factory.ts                ← bot() ファクトリ関数
      types.ts                  ← 全型定義（Exchange / Market / Config 系 / BotResult 等）
      builder.ts                ← BotBuilder クラス + インターフェース定義
      exchanges/
        index.ts                ← ExchangeAdapter interface + createExchangeAdapter()
        bitbank/
          index.ts              ← BitbankAdapter implements ExchangeAdapter
          client.ts             ← bitbank-api-node のラッパー
      pipeline/
        context.ts              ← MarketContext 実装（ExchangeAdapter 経由でデータ取得）
        guard-runner.ts         ← dispatch: GuardConfig.type → GuardHandler
        signal-runner.ts        ← dispatch: SignalConfig.type → SignalHandler
        strategy-runner.ts      ← dispatch: StrategyConfig.type → StrategyHandler
        guards/                 ← Guard ハンドラー群（プラグイン層）
          spread.ts
          volume.ts
          time.ts
          balance.ts
          margin-ratio.ts
          funding-rate-limit.ts
        signals/                ← Signal ハンドラー群（プラグイン層）
          rsi.ts
          macd.ts
          price.ts
          always.ts
          funding-rate.ts
          open-interest.ts
        strategies/             ← Strategy ハンドラー群（プラグイン層）
          market-buy.ts
          market-sell.ts
          limit-buy.ts
          limit-sell.ts
          dca.ts
          grid.ts
```

---

## 7. パイプライン実行フロー

```
bot({ pair: 'btc_jpy', market: Market.Spot })
  │
  ▼
1. MarketContext の構築（context.ts）
   共通: ticker / orderbook / ohlcv / openOrders / balance
   derivatives のみ: positions / fundingRate / marginRatio
  │
  ▼
2. Guard 評価（guard-runner.ts） ─ AND 条件
   全て通過 → 次へ
   1つでも失敗 → BotResult { passed: false, triggered: false, executed: false }
  │
  ▼
3. Signal 評価（signal-runner.ts） ─ OR 条件
   1つでも発火 → 次へ
   どれも発火せず → BotResult { passed: true, triggered: false, executed: false }
  │
  ▼
4. Strategy 実行（strategy-runner.ts）
   strategies を順番に全て実行 → Order[] を収集
  │
  ▼
5. 完了
   BotResult { passed: true, triggered: true, executed: true, orders: [...] }
```

### エラーハンドリング

- 例外はスローせず、`BotResult.errors` に格納して返す
- 複数 Strategy の一部が失敗した場合、成功した Order は `orders` に含め、失敗分は `errors` に追加する

---

## 8. プラグイン拡張ガイド

ハンドラーを追加することで Guard / Signal / Strategy を拡張できる。
各ハンドラーは Section 5-3 の型契約を満たす関数として実装する。

### Guard の追加例

```typescript
// 1. types.ts の GuardType enum に追加
enum GuardType {
  // ...既存のメンバー...
  LiquidationDistance = 'liquidation-distance',  // ← 追加
}

// 2. pipeline/guards/liquidation-distance.ts
import type { GuardHandler } from '../types'
import { GuardType, Market } from '../types'

type Config = { type: GuardType.LiquidationDistance; min: number }

export const liquidationDistanceGuard: GuardHandler<Config, Market.Perpetual | Market.Futures> = async (config, ctx) => {
  const ratio = await ctx.marginRatio()
  return ratio >= config.min
}
```

### Signal の追加例

```typescript
// pipeline/signals/price.ts
import type { SignalHandler } from '../types'

type Config = { type: SignalType.Price; above?: number; below?: number }

export const priceSignal: SignalHandler<Config> = async (config, ctx) => {
  const { last } = await ctx.ticker()
  if (config.above !== undefined && last <= config.above) return false
  if (config.below !== undefined && last >= config.below) return false
  return true
}
```

### Strategy の追加例

```typescript
// pipeline/strategies/market-buy.ts
import type { StrategyHandler } from '../types'

type Config = { type: StrategyType.MarketBuy; amount: number }

export const marketBuyStrategy: StrategyHandler<Config> = async (config, ctx, adapter) => {
  const pair = ctx.pair
  return [await adapter.placeOrder({ pair, side: 'buy', type: 'market', amount: config.amount })]
}
```

`StrategyHandler` は第3引数に `adapter` を受け取るため、`adapter.placeOrder()` で直接発注できる。
`pair` は `ctx.pair` から取得する（`MarketContext` に追加済み）。

### 手順（Guard を例に）

1. `types.ts` の `GuardType` enum に識別子を追加し、`CommonGuardConfig` または `DerivativesGuardConfig` に型を追加
2. `pipeline/guards/{name}.ts` に `GuardHandler` を実装
3. `pipeline/guard-runner.ts` の dispatch map に登録

Signal / Strategy も同じパターン（対応する enum・Config 型と runner の dispatch map を更新）。

---

### 新しい取引所の追加

1. `types.ts` の `Exchange` enum に追加：
   ```typescript
   enum Exchange {
     Bitbank = 'bitbank',
     Bybit   = 'bybit',
   }
   ```
2. `exchanges/{exchange}/index.ts` に `ExchangeAdapter` を実装
3. `exchanges/index.ts` の `createExchangeAdapter()` に `case` を追加
4. 環境変数 `{EXCHANGE}_API_KEY` / `{EXCHANGE}_API_SECRET` をドキュメント・infra に追加

---

## 9. 実装優先順位

| フェーズ | 内容 |
|---------|------|
| Phase 1 | `types.ts`, `builder.ts`, `factory.ts` — 型定義と BotBuilder 骨格 |
| Phase 2 | `exchanges/index.ts` — `ExchangeAdapter` インターフェース定義 |
| Phase 3 | `exchanges/bitbank/` — BitbankAdapter 実装（spot から実装） |
| Phase 4 | `pipeline/context.ts` — ExchangeAdapter 経由でデータ取得 |
| Phase 5 | `pipeline/guard-runner.ts` — ガード評価 |
| Phase 6 | `pipeline/signal-runner.ts` — シグナル評価 |
| Phase 7 | `pipeline/strategy-runner.ts` — ストラテジー実行（spot から実装） |
| Phase 8 | `index.ts` を `run()` ベースに更新 |
| Phase 9 | derivatives 対応（BitbankAdapter / context / strategy-runner の拡張） |
