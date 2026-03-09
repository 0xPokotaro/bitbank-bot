import type { GuardHandler } from '../../types'
import { GuardType } from '../../types'

type Config = { type: GuardType.Spread; max: number }

export const spreadGuard: GuardHandler<Config> = async (config, ctx) => {
  const { buy, sell } = await ctx.ticker()
  const spreadPct     = ((sell - buy) / buy) * 100
  return spreadPct <= config.max
}
