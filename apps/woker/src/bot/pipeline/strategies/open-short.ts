import type { StrategyHandler } from '../../types'
import { StrategyType, Market } from '../../types'

type Config = { type: StrategyType.OpenShort; amount: number; leverage?: number }

export const openShortStrategy: StrategyHandler<Config, Market.Perpetual | Market.Futures> = async (config, ctx, adapter) => {
  console.log(`[Strategy] open-short amount=${config.amount} leverage=${config.leverage}`)
  const order = await adapter.placeOrder({
    pair:          ctx.pair,
    side:          'sell',
    type:          'market',
    amount:        config.amount,
    leverage:      config.leverage,
    positionSide:  'short',
  })
  return [order]
}
