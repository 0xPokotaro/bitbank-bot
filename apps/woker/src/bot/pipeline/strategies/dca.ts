import type { StrategyHandler } from '../../types'
import { StrategyType } from '../../types'

type Config = { type: StrategyType.Dca; amount: number }

// Dollar-Cost Averaging: always buy a fixed JPY amount at market price
export const dcaStrategy: StrategyHandler<Config> = async (config, ctx, adapter) => {
  const { last } = await ctx.ticker()
  // amount is in quote currency (JPY); convert to base currency
  const baseAmount = config.amount / last
  console.log(`[Strategy] dca jpyAmount=${config.amount} baseAmount=${baseAmount.toFixed(8)} last=${last}`)
  const order = await adapter.placeOrder({
    pair:   ctx.pair,
    side:   'buy',
    type:   'market',
    amount: baseAmount,
  })
  return [order]
}
