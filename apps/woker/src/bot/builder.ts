import type {
  Market,
  BotConfig,
  GuardConfig,
  SignalConfig,
  StrategyConfig,
  BotResult,
  GuardBuilder,
  SignalBuilder,
  StrategyBuilder,
} from './types'
import { createExchangeAdapter } from './exchanges'
import { createContext }         from './pipeline/context'
import { runGuards }             from './pipeline/guard-runner'
import { runSignals }            from './pipeline/signal-runner'
import { runStrategies }         from './pipeline/strategy-runner'

export class BotBuilder<M extends Market> {
  private _guards:     GuardConfig<M>[]    = []
  private _signals:    SignalConfig<M>[]   = []
  private _strategies: StrategyConfig<M>[] = []

  constructor(private config: BotConfig<M>) {}

  guard(config: GuardConfig<M>): GuardBuilder<M> {
    this._guards.push(config)
    return this as unknown as GuardBuilder<M>
  }

  signal(config: SignalConfig<M>): SignalBuilder<M> {
    this._signals.push(config)
    return this as unknown as SignalBuilder<M>
  }

  strategy(config: StrategyConfig<M>): StrategyBuilder<M> {
    this._strategies.push(config)
    return this as unknown as StrategyBuilder<M>
  }

  async run(): Promise<BotResult> {
    const adapter = createExchangeAdapter(this.config)
    const ctx     = createContext(this.config, adapter)

    console.log(`[Bot] pair=${this.config.pair} market=${this.config.market}`)

    // 1. Guard (AND)
    const passed = await runGuards(this._guards, ctx)
    if (!passed) {
      return { passed: false, triggered: false, executed: false }
    }

    // 2. Signal (OR)
    const triggered = await runSignals(this._signals, ctx)
    if (!triggered) {
      return { passed: true, triggered: false, executed: false }
    }

    // 3. Strategy (all, errors collected)
    const { orders, errors } = await runStrategies(this._strategies, ctx, adapter)
    return {
      passed:    true,
      triggered: true,
      executed:  true,
      orders:    orders.length > 0 ? orders : undefined,
      errors:    errors.length > 0 ? errors : undefined,
    }
  }
}
