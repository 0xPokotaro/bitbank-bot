import type { StrategyHandler } from '../../types'
import { StrategyType } from '../../types'

type Config = { type: StrategyType.MarketBuy; amount: number }

export const marketBuyStrategy: StrategyHandler<Config> = async (config, ctx, adapter) => {
  console.log(`[Strategy] market-buy amount=${config.amount}`)
  const order = await adapter.placeOrder({
    pair:   ctx.pair,
    side:   'buy',
    type:   'market',
    amount: config.amount,
  })
  return [order]
}
