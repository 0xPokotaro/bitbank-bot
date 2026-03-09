import type { StrategyHandler } from '../../types'
import { StrategyType } from '../../types'

type Config = { type: StrategyType.LimitBuy; amount: number; price: number }

export const limitBuyStrategy: StrategyHandler<Config> = async (config, ctx, adapter) => {
  console.log(`[Strategy] limit-buy amount=${config.amount} price=${config.price}`)
  const order = await adapter.placeOrder({
    pair:   ctx.pair,
    side:   'buy',
    type:   'limit',
    amount: config.amount,
    price:  config.price,
  })
  return [order]
}
