import type { StrategyHandler, Position } from '../../types'
import { StrategyType, Market } from '../../types'

type Config = { type: StrategyType.CloseShort; amount: number | 'all' }

export const closeShortStrategy: StrategyHandler<Config, Market.Perpetual | Market.Futures> = async (config, ctx, adapter) => {
  let amount = config.amount
  if (amount === 'all') {
    const positions: Position[] = await (ctx as any).positions()
    const short = positions.find((p) => p.side === 'short')
    if (!short || short.amount === 0) {
      console.log('[Strategy] close-short: no short position to close')
      return []
    }
    amount = short.amount
  }
  console.log(`[Strategy] close-short amount=${amount}`)
  const order = await adapter.placeOrder({
    pair:         ctx.pair,
    side:         'buy',
    type:         'market',
    amount:       amount as number,
    positionSide: 'short',
  })
  return [order]
}
