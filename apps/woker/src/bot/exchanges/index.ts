import type { ExchangeAdapter, BotConfig } from '../types'
import { Exchange } from '../types'
import { BitbankAdapter } from './bitbank'

export type { ExchangeAdapter }

export function createExchangeAdapter(config: BotConfig): ExchangeAdapter {
  const exchange = config.exchange ?? Exchange.Bitbank
  switch (exchange) {
    case Exchange.Bitbank:
      return new BitbankAdapter(config)
    default:
      throw new Error(`Unsupported exchange: ${exchange}`)
  }
}
