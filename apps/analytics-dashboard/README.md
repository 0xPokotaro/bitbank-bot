# Analytics Dashboard

Bot のパフォーマンスを可視化する Next.js ダッシュボード。戦略改善のための KPI とトレード分析を提供する。

## 要件定義

### 目的

Bot のパフォーマンスを可視化し、戦略改善によって勝率と期待値を最大化する。

| レベル     | 目的                         |
| ---------- | ---------------------------- |
| 最終目的   | 資産を増やす                 |
| 戦略目的   | Bot の勝率・期待値を高める   |
| 運用目的   | Bot の状態を分析し改善する   |
| ダッシュボード目的 | 意思決定のためのデータを可視化する |

### 役割

Bot の状態をリアルタイムで観測し、戦略改善のための洞察を得る。

### 分析観点

| 観点 | 内容 |
| ---- | ---- |
| Strategy | Bot 設定 |
| Market | 市場環境 |
| Performance | 結果 |

**Market Environment**（拡張可能な定義）

Bot のパフォーマンスに影響を与える外部要因の総称。以下のカテゴリを含む。

| カテゴリ | 説明 |
| -------- | ---- |
| Price Environment | 価格環境 |
| Market Structure | 市場構造 |
| Market Sentiment | 市場センチメント |

### KPI

| カテゴリ     | 指標 |
| ------------ | ---- |
| **Profit**   | Total PnL / Daily PnL / Strategy PnL |
| **勝率**     | Win Rate / Win/Loss Ratio / Profit Factor |
| **リスク**   | Max Drawdown / Volatility / Exposure |
| **トレード分析** | Average trade / Holding time / Slippage |

---

## Getting Started

リポジトリルートから:

```bash
pnpm dev
```

このアプリのみ起動する場合（`apps/analytics-dashboard` で）:

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。編集は `src/app/page.tsx` から。フォントは [Geist](https://vercel.com/font)（`next/font`）を使用。

## 参考

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)（Vercel 等）
