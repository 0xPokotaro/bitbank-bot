import type { GuardHandler } from '../../types'
import { GuardType, Market } from '../../types'

type Config = { type: GuardType.MarginRatio; min: number }

export const marginRatioGuard: GuardHandler<Config, Market.Perpetual | Market.Futures> = async (config, ctx) => {
  const ratio = await (ctx as any).marginRatio()
  return ratio >= config.min
}
