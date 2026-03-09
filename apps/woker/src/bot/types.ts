// ============================================================
// Enums
// ============================================================

export enum Exchange {
  Bitbank = 'bitbank',
}

export enum Market {
  Spot      = 'spot',
  Perpetual = 'perpetual',
  Futures   = 'futures',
}

export enum GuardType {
  Spread           = 'spread',
  Volume           = 'volume',
  Time             = 'time',
  Balance          = 'balance',
  MarginRatio      = 'margin-ratio',
  FundingRateLimit = 'funding-rate-limit',
}

export enum SignalType {
  Rsi          = 'rsi',
  Macd         = 'macd',
  Price        = 'price',
  Always       = 'always',
  FundingRate  = 'funding-rate',
  OpenInterest = 'open-interest',
}

export enum StrategyType {
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

// ============================================================
// DSL Config types
// ============================================================

export interface BotConfig<M extends Market = Market> {
  exchange?: Exchange
  pair: string
  market: M
  apiKey?: string
  apiSecret?: string
}

// --- Guard ---

export type CommonGuardConfig =
  | { type: GuardType.Spread;  max: number }
  | { type: GuardType.Volume;  min: number }
  | { type: GuardType.Time;    start: string; end: string; timezone?: string }
  | { type: GuardType.Balance; min: number; currency: 'jpy' | 'base' }

export type DerivativesGuardConfig =
  | { type: GuardType.MarginRatio;      min: number }
  | { type: GuardType.FundingRateLimit; max: number }

export type GuardConfig<M extends Market> =
  M extends Market.Spot
    ? CommonGuardConfig
    : M extends Market.Perpetual
      ? CommonGuardConfig | DerivativesGuardConfig
      : CommonGuardConfig | Exclude<DerivativesGuardConfig, { type: GuardType.FundingRateLimit }>

// --- Signal ---

export type CommonSignalConfig =
  | { type: SignalType.Rsi;   period?: number; threshold: number; direction: 'above' | 'below' }
  | { type: SignalType.Macd;  fast?: number; slow?: number; signal?: number; direction: 'golden-cross' | 'dead-cross' }
  | { type: SignalType.Price; above?: number; below?: number }
  | { type: SignalType.Always }

export type DerivativesSignalConfig =
  | { type: SignalType.FundingRate;  threshold: number; direction: 'above' | 'below' }
  | { type: SignalType.OpenInterest; threshold: number; direction: 'above' | 'below' }

export type SignalConfig<M extends Market> =
  M extends Market.Spot
    ? CommonSignalConfig
    : CommonSignalConfig | DerivativesSignalConfig

// --- Strategy ---

export type SpotStrategyConfig =
  | { type: StrategyType.MarketBuy;  amount: number }
  | { type: StrategyType.MarketSell; amount: number }
  | { type: StrategyType.LimitBuy;   amount: number; price: number }
  | { type: StrategyType.LimitSell;  amount: number; price: number }
  | { type: StrategyType.Dca;        amount: number }
  | { type: StrategyType.Grid;       levels: number; rangePercent: number; amount: number }

export type DerivativesStrategyConfig =
  | { type: StrategyType.OpenLong;   amount: number; leverage?: number }
  | { type: StrategyType.OpenShort;  amount: number; leverage?: number }
  | { type: StrategyType.CloseLong;  amount: number | 'all' }
  | { type: StrategyType.CloseShort; amount: number | 'all' }

export type StrategyConfig<M extends Market> =
  M extends Market.Spot
    ? SpotStrategyConfig
    : DerivativesStrategyConfig

// ============================================================
// Domain types (shared across engine and plugins)
// ============================================================

export interface Ticker {
  last: number
  buy:  number  // highest bid
  sell: number  // lowest ask
  high: number
  low:  number
  vol:  number
  timestamp: number
}

export interface Orderbook {
  asks: [number, number][]  // [price, amount], ascending
  bids: [number, number][]  // [price, amount], descending
}

export interface Ohlcv {
  open:      number
  high:      number
  low:       number
  close:     number
  volume:    number
  timestamp: number
}

export interface OpenOrder {
  orderId: string
  pair:    string
  side:    'buy' | 'sell'
  type:    'market' | 'limit'
  amount:  number
  price?:  number
}

export interface Balance {
  [asset: string]: number
}

export interface Position {
  pair:   string
  side:   'long' | 'short'
  amount: number
  price:  number
}

export interface FundingRate {
  rate:            number
  nextFundingTime?: number
}

export interface MacdResult {
  macd:      number
  signal:    number
  histogram: number
}

export interface OrderParams {
  pair:          string
  side:          'buy' | 'sell'
  type:          'market' | 'limit'
  amount:        number
  price?:        number
  leverage?:     number
  positionSide?: 'long' | 'short'
}

export interface Order {
  orderId:       string
  pair:          string
  side:          'buy' | 'sell'
  type:          'market' | 'limit'
  amount:        number
  price?:        number
  leverage?:     number
  positionSide?: 'long' | 'short'
  status:        'filled' | 'unfilled' | 'partially_filled'
}

export interface BotResult {
  passed:    boolean
  triggered: boolean
  executed:  boolean
  orders?:   Order[]
  errors?:   Error[]
}

// ============================================================
// Engine types (used by runner and plugin implementors)
// ============================================================

export interface MarketContext<M extends Market> {
  pair: string
  ticker():                        Promise<Ticker>
  orderbook():                     Promise<Orderbook>
  ohlcv(timeframe?: string):       Promise<Ohlcv[]>
  openOrders():                    Promise<OpenOrder[]>
  balance():                       Promise<Balance>
  // derivatives only — spot に対して呼び出すと never 型になりコンパイルエラー（意図的な型ガード）
  positions:    M extends Market.Spot ? never : () => Promise<Position[]>
  fundingRate:  M extends Market.Spot ? never : () => Promise<FundingRate>
  marginRatio:  M extends Market.Spot ? never : () => Promise<number>
  openInterest: M extends Market.Spot ? never : () => Promise<number>
  // indicators (lazy-evaluated, cached)
  rsi(period?: number):                                      Promise<number>
  macd(fast?: number, slow?: number, signal?: number):       Promise<MacdResult>
}

export interface ExchangeAdapter {
  // common
  fetchTicker(pair: string):                  Promise<Ticker>
  fetchOrderbook(pair: string):               Promise<Orderbook>
  fetchOhlcv(pair: string, timeframe: string): Promise<Ohlcv[]>
  fetchOpenOrders(pair: string):              Promise<OpenOrder[]>
  fetchBalance():                             Promise<Balance>
  // derivatives only (optional on spot-only adapters)
  fetchPositions?(pair: string):              Promise<Position[]>
  fetchFundingRate?(pair: string):            Promise<FundingRate>
  fetchMarginRatio?():                        Promise<number>
  fetchOpenInterest?(pair: string):           Promise<number>
  // orders
  placeOrder(params: OrderParams):            Promise<Order>
  cancelOrder(orderId: string, pair: string): Promise<void>
}

export type GuardHandler<C, M extends Market = Market> =
  (config: C, ctx: MarketContext<M>) => Promise<boolean>

export type SignalHandler<C, M extends Market = Market> =
  (config: C, ctx: MarketContext<M>) => Promise<boolean>

export type StrategyHandler<C, M extends Market = Market> =
  (config: C, ctx: MarketContext<M>, adapter: ExchangeAdapter) => Promise<Order[]>

// Builder interfaces (enforce guard → signal → strategy order at type level)
export interface GuardBuilder<M extends Market> {
  guard(config: GuardConfig<M>):  GuardBuilder<M>
  signal(config: SignalConfig<M>): SignalBuilder<M>
}

export interface SignalBuilder<M extends Market> {
  signal(config: SignalConfig<M>):   SignalBuilder<M>
  strategy(config: StrategyConfig<M>): StrategyBuilder<M>
}

export interface StrategyBuilder<M extends Market> {
  strategy(config: StrategyConfig<M>): StrategyBuilder<M>
  run(): Promise<BotResult>
}
