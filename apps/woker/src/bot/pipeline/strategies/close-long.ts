import type { StrategyHandler, Position } from '../../types'
import { StrategyType, Market } from '../../types'

type Config = { type: StrategyType.CloseLong; amount: number | 'all' }

export const closeLongStrategy: StrategyHandler<Config, Market.Perpetual | Market.Futures> = async (config, ctx, adapter) => {
  let amount = config.amount
  if (amount === 'all') {
    const positions: Position[] = await (ctx as any).positions()
    const long = positions.find((p) => p.side === 'long')
    if (!long || long.amount === 0) {
      console.log('[Strategy] close-long: no long position to close')
      return []
    }
    amount = long.amount
  }
  console.log(`[Strategy] close-long amount=${amount}`)
  const order = await adapter.placeOrder({
    pair:         ctx.pair,
    side:         'sell',
    type:         'market',
    amount:       amount as number,
    positionSide: 'long',
  })
  return [order]
}
