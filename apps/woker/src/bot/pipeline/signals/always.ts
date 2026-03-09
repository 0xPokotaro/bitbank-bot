import type { SignalHandler } from '../../types'
import { SignalType } from '../../types'

type Config = { type: SignalType.Always }

export const alwaysSignal: SignalHandler<Config> = async () => {
  console.log('[Signal] always → true')
  return true
}
