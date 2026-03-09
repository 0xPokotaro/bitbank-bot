import type {
  ExchangeAdapter,
  Ticker,
  Orderbook,
  Ohlcv,
  OpenOrder,
  Balance,
  Position,
  FundingRate,
  OrderParams,
  Order,
} from '../../types'
import type { BotConfig } from '../../types'
import { BitbankClient } from './client'

// Map common timeframe strings to bitbank CandleType values
const TIMEFRAME_MAP: Record<string, string> = {
  '1min':   '1min',
  '5min':   '5min',
  '15min':  '15min',
  '30min':  '30min',
  '1hour':  '1hour',
  '4hour':  '4hour',
  '8hour':  '8hour',
  '12hour': '12hour',
  '1day':   '1day',
  '1week':  '1week',
  '1month': '1month',
  // common aliases
  '1h':  '1hour',
  '4h':  '4hour',
  '1d':  '1day',
  '1w':  '1week',
  '1m':  '1min',
}

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function mapOrderStatus(status: string): Order['status'] {
  if (status === 'FULLY_FILLED') return 'filled'
  if (status === 'PARTIALLY_FILLED' || status === 'CANCELED_PARTIALLY_FILLED') return 'partially_filled'
  return 'unfilled'
}

export class BitbankAdapter implements ExchangeAdapter {
  private client: BitbankClient

  constructor(config: Pick<BotConfig, 'apiKey' | 'apiSecret'>) {
    const apiKey    = config.apiKey    ?? process.env['BITBANK_API_KEY']
    const apiSecret = config.apiSecret ?? process.env['BITBANK_API_SECRET']
    this.client = new BitbankClient(apiKey, apiSecret)
  }

  async fetchTicker(pair: string): Promise<Ticker> {
    const res = await this.client.public.getTicker(pair as any)
    const d   = res.data
    return {
      last:      parseFloat(d.last),
      buy:       parseFloat(d.buy),
      sell:      parseFloat(d.sell),
      high:      parseFloat(d.high),
      low:       parseFloat(d.low),
      vol:       parseFloat(d.vol),
      timestamp: d.timestamp,
    }
  }

  async fetchOrderbook(pair: string): Promise<Orderbook> {
    const res = await this.client.public.getDepth(pair as any)
    const d   = res.data
    return {
      asks: d.asks.map(([p, a]) => [parseFloat(p), parseFloat(a)] as [number, number]),
      bids: d.bids.map(([p, a]) => [parseFloat(p), parseFloat(a)] as [number, number]),
    }
  }

  async fetchOhlcv(pair: string, timeframe = '1hour'): Promise<Ohlcv[]> {
    const candleType = (TIMEFRAME_MAP[timeframe] ?? timeframe) as any
    const today     = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    // Fetch yesterday + today to have enough candles for RSI/MACD warmup
    const [resYesterday, resToday] = await Promise.all([
      this.client.public.getCandlestick(pair as any, candleType, toDateStr(yesterday)),
      this.client.public.getCandlestick(pair as any, candleType, toDateStr(today)),
    ])

    const parse = (res: typeof resYesterday): Ohlcv[] => {
      const stick = res.data.candlestick[0]
      if (!stick) return []
      return stick.ohlcv.map(([o, h, l, c, v, ts]) => ({
        open:      parseFloat(o as string),
        high:      parseFloat(h as string),
        low:       parseFloat(l as string),
        close:     parseFloat(c as string),
        volume:    parseFloat(v as string),
        timestamp: ts as number,
      }))
    }

    return [...parse(resYesterday), ...parse(resToday)]
  }

  async fetchOpenOrders(pair: string): Promise<OpenOrder[]> {
    const res = await this.client.private.getActiveOrders({ pair: pair as any })
    return res.data.orders.map((o) => ({
      orderId: String(o.order_id),
      pair:    o.pair,
      side:    o.side as 'buy' | 'sell',
      type:    o.type as 'market' | 'limit',
      amount:  parseFloat(o.executed_amount || o.start_amount || '0'),
      price:   o.price ? parseFloat(o.price) : undefined,
    }))
  }

  async fetchBalance(): Promise<Balance> {
    const res     = await this.client.private.getAssets()
    const balance: Balance = {}
    for (const asset of res.data.assets) {
      balance[asset.asset] = parseFloat(asset.free_amount)
    }
    return balance
  }

  async fetchPositions(pair: string): Promise<Position[]> {
    const res = await this.client.private.getMarginPositions()
    return res.data.positions
      .filter((p) => p.pair === pair)
      .map((p) => ({
        pair:   p.pair,
        side:   p.position_side as 'long' | 'short',
        amount: parseFloat(p.open_amount),
        price:  parseFloat(p.average_price),
      }))
  }

  async fetchFundingRate(_pair: string): Promise<FundingRate> {
    // bitbank does not currently publish funding rate via REST API
    throw new Error('fetchFundingRate is not supported by Bitbank')
  }

  async fetchMarginRatio(): Promise<number> {
    const res        = await this.client.private.getMarginStatus()
    const percentage = res.data.total_margin_balance_percentage
    if (percentage === null) return 0
    return parseFloat(percentage)
  }

  async fetchOpenInterest(_pair: string): Promise<number> {
    // bitbank does not publish open interest data
    throw new Error('fetchOpenInterest is not supported by Bitbank')
  }

  async placeOrder(params: OrderParams): Promise<Order> {
    const res = await this.client.private.submitOrder({
      pair:          params.pair as any,
      side:          params.side as any,
      type:          params.type as any,
      amount:        String(params.amount),
      price:         params.price !== undefined ? String(params.price) : undefined,
      position_side: params.positionSide as any,
    })
    const o = res.data
    return {
      orderId:       String(o.order_id),
      pair:          o.pair,
      side:          o.side as 'buy' | 'sell',
      type:          o.type as 'market' | 'limit',
      amount:        parseFloat(o.executed_amount || o.start_amount || '0'),
      price:         o.price ? parseFloat(o.price) : undefined,
      positionSide:  o.position_side as 'long' | 'short' | undefined,
      status:        mapOrderStatus(o.status),
    }
  }

  async cancelOrder(orderId: string, pair: string): Promise<void> {
    await this.client.private.cancelOrder({ order_id: parseInt(orderId), pair: pair as any })
  }
}
