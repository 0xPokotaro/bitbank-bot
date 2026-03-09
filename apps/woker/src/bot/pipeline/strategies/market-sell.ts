import type { StrategyHandler } from '../../types'
import { StrategyType } from '../../types'

type Config = { type: StrategyType.MarketSell; amount: number }

export const marketSellStrategy: StrategyHandler<Config> = async (config, ctx, adapter) => {
  console.log(`[Strategy] market-sell amount=${config.amount}`)
  const order = await adapter.placeOrder({
    pair:   ctx.pair,
    side:   'sell',
    type:   'market',
    amount: config.amount,
  })
  return [order]
}
