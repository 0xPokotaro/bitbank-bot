import type {
  BotConfig,
  Market,
  ExchangeAdapter,
  MarketContext,
  Ticker,
  Orderbook,
  Ohlcv,
  OpenOrder,
  Balance,
  Position,
  FundingRate,
  MacdResult,
} from '../types'
import { Market as MarketEnum } from '../types'

// ─── RSI ───────────────────────────────────────────────────────────────────

function calcRsi(closes: number[], period: number): number {
  if (closes.length < period + 1) {
    throw new Error(`RSI requires at least ${period + 1} candles, got ${closes.length}`)
  }
  const changes = closes.slice(1).map((c, i) => c - closes[i])

  // Initial average gain/loss over the first `period` changes
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += -changes[i]
  }
  avgGain /= period
  avgLoss /= period

  // Wilder's smoothing for the rest
  for (let i = period; i < changes.length; i++) {
    const gain = Math.max(0, changes[i])
    const loss = Math.max(0, -changes[i])
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

// ─── EMA / MACD ────────────────────────────────────────────────────────────

function calcEma(values: number[], period: number): number[] {
  const k   = 2 / (period + 1)
  const ema = [values[0]]
  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k))
  }
  return ema
}

function calcMacd(
  closes: number[],
  fast:   number,
  slow:   number,
  signal: number,
): MacdResult {
  const minLen = slow + signal
  if (closes.length < minLen) {
    throw new Error(`MACD requires at least ${minLen} candles, got ${closes.length}`)
  }

  const emaFast  = calcEma(closes, fast)
  const emaSlow  = calcEma(closes, slow)
  const macdLine = emaFast.map((f, i) => f - emaSlow[i])

  // Signal line is EMA of macdLine; use the portion after slow warmup
  const macdForSignal = macdLine.slice(slow - 1)
  const signalLine    = calcEma(macdForSignal, signal)

  const lastMacd   = macdLine[macdLine.length - 1]
  const lastSignal = signalLine[signalLine.length - 1]
  return { macd: lastMacd, signal: lastSignal, histogram: lastMacd - lastSignal }
}

// ─── Context implementation ────────────────────────────────────────────────

export class MarketContextImpl<M extends Market> {
  readonly pair: string

  // derivatives-only properties set conditionally in constructor
  readonly positions:    any
  readonly fundingRate:  any
  readonly marginRatio:  any
  readonly openInterest: any

  private _cache = new Map<string, Promise<unknown>>()

  constructor(
    private config:  BotConfig<M>,
    private adapter: ExchangeAdapter,
  ) {
    this.pair = config.pair

    if (config.market !== MarketEnum.Spot) {
      this.positions    = () => this._fetch('positions',    () => adapter.fetchPositions!(config.pair))
      this.fundingRate  = () => this._fetch('fundingRate',  () => adapter.fetchFundingRate!(config.pair))
      this.marginRatio  = () => this._fetch('marginRatio',  () => adapter.fetchMarginRatio!())
      this.openInterest = () => this._fetch('openInterest', () => adapter.fetchOpenInterest!(config.pair))
    }
  }

  private _fetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!this._cache.has(key)) {
      this._cache.set(key, fn())
    }
    return this._cache.get(key) as Promise<T>
  }

  ticker():     Promise<Ticker>     { return this._fetch('ticker',     () => this.adapter.fetchTicker(this.pair)) }
  orderbook():  Promise<Orderbook>  { return this._fetch('orderbook',  () => this.adapter.fetchOrderbook(this.pair)) }
  openOrders(): Promise<OpenOrder[]> { return this._fetch('openOrders', () => this.adapter.fetchOpenOrders(this.pair)) }
  balance():    Promise<Balance>    { return this._fetch('balance',    () => this.adapter.fetchBalance()) }

  ohlcv(timeframe = '1hour'): Promise<Ohlcv[]> {
    return this._fetch(`ohlcv:${timeframe}`, () => this.adapter.fetchOhlcv(this.pair, timeframe))
  }

  async rsi(period = 14): Promise<number> {
    const candles = await this.ohlcv()
    const closes  = candles.map((c) => c.close)
    return calcRsi(closes, period)
  }

  async macd(fast = 12, slow = 26, signal = 9): Promise<MacdResult> {
    const candles = await this.ohlcv()
    const closes  = candles.map((c) => c.close)
    return calcMacd(closes, fast, slow, signal)
  }
}

export function createContext<M extends Market>(
  config:  BotConfig<M>,
  adapter: ExchangeAdapter,
): MarketContext<M> {
  return new MarketContextImpl(config, adapter) as unknown as MarketContext<M>
}
