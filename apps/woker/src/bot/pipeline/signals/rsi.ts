import type { SignalHandler } from '../../types'
import { SignalType } from '../../types'

type Config = { type: SignalType.Rsi; period?: number; threshold: number; direction: 'above' | 'below' }

export const rsiSignal: SignalHandler<Config> = async (config, ctx) => {
  const period = config.period ?? 14
  const rsi    = await ctx.rsi(period)
  console.log(`[Signal] rsi=${rsi.toFixed(2)}, threshold=${config.threshold}, direction=${config.direction}`)
  return config.direction === 'above' ? rsi > config.threshold : rsi < config.threshold
}
