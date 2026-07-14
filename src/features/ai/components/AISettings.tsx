import { useEffect } from 'react'
import { Icon } from '../../../shared/ui'
import { cn } from '../../../shared/utils/cn'
import { useAIStore } from '../hooks/useAIStore'
import { aiManager } from '../provider-manager'

function StatusBadge() {
  const status = useAIStore((s) => s.status)
  const available = useAIStore((s) => s.available)

  if (status === 'checking') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/40 bg-amber-900/20 px-2.5 py-1 text-xs font-medium text-amber-300">
        <Icon name="sync" size={12} aria-hidden="true" />
        Checking…
      </span>
    )
  }

  if (available) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-900/20 px-2.5 py-1 text-xs font-medium text-emerald-300">
        <Icon name="check" size={12} aria-hidden="true" />
        Connected
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/50 px-2.5 py-1 text-xs font-medium text-neutral-400">
      <Icon name="x" size={12} aria-hidden="true" />
      Not detected
    </span>
  )
}

export function AISettings() {
  const providers = aiManager.listProviders()
  const providerId = useAIStore((s) => s.providerId)
  const providerName = useAIStore((s) => s.providerName)
  const models = useAIStore((s) => s.models)
  const model = useAIStore((s) => s.model)
  const available = useAIStore((s) => s.available)
  const status = useAIStore((s) => s.status)
  const initialized = useAIStore((s) => s.initialized)

  const setProvider = useAIStore((s) => s.setProvider)
  const setModel = useAIStore((s) => s.setModel)
  const refresh = useAIStore((s) => s.refresh)
  const init = useAIStore((s) => s.init)

  useEffect(() => {
    if (!initialized) void init()
  }, [initialized, init])

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-100">
          AI Providers
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Atlas connects to local AI providers on your machine. No data leaves your device.
        </p>
      </header>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-300">Provider</h3>
          <StatusBadge />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {providers.map((p) => {
            const active = p.id === providerId
            return (
              <button
                key={p.id}
                type="button"
                disabled={!p.implemented}
                onClick={() => void setProvider(p.id)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-primary-600 bg-primary-900/20 text-neutral-100'
                    : 'border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700',
                  !p.implemented && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-neutral-500">
                  {p.implemented
                    ? p.isLocal
                      ? 'Local'
                      : 'Remote'
                    : 'Coming soon'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-300">
            Model
          </h3>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={status === 'checking'}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/50 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-700 disabled:opacity-50"
          >
            <Icon name="sync" size={12} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {available && models.length > 0 ? (
          <select
            value={model ?? ''}
            onChange={(e) => void setModel(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-primary-600"
          >
            <option value="" disabled>
              Select a model…
            </option>
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-400">
            {!available ? (
              <p>
                Local AI not detected. Install{' '}
                <span className="font-medium text-neutral-200">Ollama</span> to enable
                intelligent conversations.
              </p>
            ) : (
              <p>
                No models found. Install one in Ollama, e.g.{' '}
                <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200">
                  ollama pull llama3
                </code>
                , then press Refresh.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-600">
        Active provider: <span className="text-neutral-400">{providerName}</span>
        {model ? (
          <>
            {' · '}Model: <span className="text-neutral-400">{model}</span>
          </>
        ) : null}
      </p>
    </section>
  )
}
