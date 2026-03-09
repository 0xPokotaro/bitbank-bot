import type { SignalHandler } from '../../types'
import { SignalType } from '../../types'

type Config = { type: SignalType.Price; above?: number; below?: number }

export const priceSignal: SignalHandler<Config> = async (config, ctx) => {
  const { last } = await ctx.ticker()
  console.log(`[Signal] price last=${last}, above=${config.above}, below=${config.below}`)
  if (config.above !== undefined && last <= config.above) return false
  if (config.below !== undefined && last >= config.below) return false
  return true
}
