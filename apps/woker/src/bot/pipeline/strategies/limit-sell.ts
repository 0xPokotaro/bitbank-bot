import type { StrategyHandler } from '../../types'
import { StrategyType } from '../../types'

type Config = { type: StrategyType.LimitSell; amount: number; price: number }

export const limitSellStrategy: StrategyHandler<Config> = async (config, ctx, adapter) => {
  console.log(`[Strategy] limit-sell amount=${config.amount} price=${config.price}`)
  const order = await adapter.placeOrder({
    pair:   ctx.pair,
    side:   'sell',
    type:   'limit',
    amount: config.amount,
    price:  config.price,
  })
  return [order]
}
