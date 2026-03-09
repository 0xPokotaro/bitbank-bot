import type { Market, GuardBuilder } from './types'
import type { BotConfig } from './types'
import { BotBuilder } from './builder'

export function bot<M extends Market>(config: BotConfig<M>): GuardBuilder<M> {
  return new BotBuilder(config) as unknown as GuardBuilder<M>
}
