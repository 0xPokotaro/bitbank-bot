import type { GuardHandler } from '../../types'
import { GuardType } from '../../types'

type Config = { type: GuardType.Volume; min: number }

export const volumeGuard: GuardHandler<Config> = async (config, ctx) => {
  const { vol } = await ctx.ticker()
  return vol >= config.min
}
