import type { GuardHandler } from '../../types'
import { GuardType, Market } from '../../types'

type Config = { type: GuardType.FundingRateLimit; max: number }

export const fundingRateLimitGuard: GuardHandler<Config, Market.Perpetual> = async (config, ctx) => {
  const { rate } = await (ctx as any).fundingRate()
  return Math.abs(rate) <= config.max
}
