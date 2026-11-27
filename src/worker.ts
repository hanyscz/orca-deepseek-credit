// Shows the DeepSeek API credit in Orca's status bar. Click the item to refresh.
import type { OrcaWorkerApi } from 'orca/worker'

const URL = 'https://api.deepseek.com/user/balance'
const SYMBOL: Record<string, string> = { USD: '$', CNY: '¥' }

type Balance = { currency?: string; total_balance?: string }
type Payload = { is_available?: boolean; balance_infos?: Balance[] }
type Lang = 'cs' | 'en'

const MESSAGES = {
  cs: {
    noKey: 'DeepSeek: nastav klíč',
    noKeyTip: 'Zadej API klíč v nastavení pluginu',
    creditTip: (credit: string) => `Kredit DeepSeek: ${credit}\nKlikni pro obnovení`,
    failedTip: (msg: string) => `Nepodařilo se načíst kredit: ${msg}`,
    invalidKey: 'Neplatný API klíč',
    unexpected: 'Neočekávaná odpověď',
    timeout: 'Vypršel časový limit'
  },
  en: {
    noKey: 'DeepSeek: set API key',
    noKeyTip: 'Enter your API key in the plugin settings',
    creditTip: (credit: string) => `DeepSeek credit: ${credit}\nClick to refresh`,
    failedTip: (msg: string) => `Could not load credit: ${msg}`,
    invalidKey: 'Invalid API key',
    unexpected: 'Unexpected response',
    timeout: 'Request timed out'
  }
} satisfies Record<Lang, unknown>

type Messages = (typeof MESSAGES)[Lang]

// Plugin workers do not get Orca's UI language, so "auto" follows the system locale.
function systemLocale(): string {
  const nav = (globalThis as { navigator?: { language?: string } }).navigator
  return nav?.language || Intl.DateTimeFormat().resolvedOptions().locale || 'en'
}

function resolveLang(setting: unknown): Lang {
  if (setting === 'cs' || setting === 'en') return setting
  return /^(cs|sk)\b/i.test(systemLocale()) ? 'cs' : 'en'
}

export function balancesToShow(infos: Balance[]): Balance[] {
  const funded = infos.filter((b) => Number(b.total_balance) > 0)
  const usd = funded.find((b) => b.currency === 'USD')
  if (usd) return [usd]
  return funded.length ? funded : infos
}

async function fetchCredit(key: string, t: Messages): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(URL, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
      signal: controller.signal
    })
    if (res.status === 401 || res.status === 403) throw new Error(t.invalidKey)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as Payload
    const infos = (data.balance_infos ?? []).filter((b) => b.currency)
    if (infos.length === 0) throw new Error(t.unexpected)
    return balancesToShow(infos)
      .map((b) => {
        const cur = String(b.currency).toUpperCase()
        const amount = Number(b.total_balance)
        const text = Number.isFinite(amount) ? amount.toFixed(2) : '?'
        return SYMBOL[cur] ? `${SYMBOL[cur]}${text}` : `${text} ${cur}`
      })
      .join(' · ')
  } catch (error) {
    if (controller.signal.aborted) throw new Error(t.timeout)
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export default function activate(orca: OrcaWorkerApi): void {
  let timer: ReturnType<typeof setInterval> | undefined
  let stopped = false

  async function show(text: string, tooltip: string, warn: boolean): Promise<void> {
    if (stopped) return
    try {
      await orca.host.call('statusBar.update', {
        id: 'credit',
        text,
        icon: warn ? 'warning' : 'database',
        tone: warn ? 'warning' : 'neutral',
        tooltip,
        visible: true
      })
    } catch {
      // headless surface
    }
  }

  async function refresh(): Promise<void> {
    const settings = (await orca.settings.get()) as { apiKey?: unknown; language?: unknown }
    const t = MESSAGES[resolveLang(settings.language)]
    const key = typeof settings.apiKey === 'string' ? settings.apiKey.trim() : ''
    if (!key) return show(t.noKey, t.noKeyTip, true)
    try {
      const credit = await fetchCredit(key, t)
      await show(`DeepSeek ${credit}`, t.creditTip(credit), false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await show('DeepSeek !', t.failedTip(msg), true)
    }
  }

  async function schedule(): Promise<void> {
    if (timer) clearInterval(timer)
    const s = (await orca.settings.get()) as { refreshMinutes?: unknown }
    const minutes = Math.min(120, Math.max(1, Number(s.refreshMinutes) || 5))
    timer = setInterval(() => void refresh(), minutes * 60_000)
  }

  orca.commands.register('deepseekCredit.refresh', async () => {
    await refresh()
    return 'ok'
  })
  orca.settings.onDidChange(() => {
    void refresh()
    void schedule()
  })
  void refresh()
  void schedule()
  ;(activate as unknown as { stop?: () => void }).stop = () => {
    stopped = true
    if (timer) clearInterval(timer)
  }
}

export function deactivate(): void {
  ;(activate as unknown as { stop?: () => void }).stop?.()
}
