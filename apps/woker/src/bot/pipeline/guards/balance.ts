import type { GuardHandler } from '../../types'
import { GuardType } from '../../types'

type Config = { type: GuardType.Balance; min: number; currency: 'jpy' | 'base' }

export const balanceGuard: GuardHandler<Config> = async (config, ctx) => {
  const bal = await ctx.balance()

  let asset: string
  if (config.currency === 'jpy') {
    asset = 'jpy'
  } else {
    // Extract base currency from pair: 'btc_jpy' → 'btc'
    asset = ctx.pair.split('_')[0]
  }

  const amount = bal[asset] ?? 0
  return amount >= config.min
}
