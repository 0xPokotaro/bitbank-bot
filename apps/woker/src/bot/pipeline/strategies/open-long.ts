import type { StrategyHandler } from '../../types'
import { StrategyType, Market } from '../../types'

type Config = { type: StrategyType.OpenLong; amount: number; leverage?: number }

export const openLongStrategy: StrategyHandler<Config, Market.Perpetual | Market.Futures> = async (config, ctx, adapter) => {
  console.log(`[Strategy] open-long amount=${config.amount} leverage=${config.leverage}`)
  const order = await adapter.placeOrder({
    pair:          ctx.pair,
    side:          'buy',
    type:          'market',
    amount:        config.amount,
    leverage:      config.leverage,
    positionSide:  'long',
  })
  return [order]
}
