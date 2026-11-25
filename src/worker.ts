// Shows the DeepSeek API credit in Orca's status bar. Click the item to refresh.
import type { OrcaWorkerApi } from 'orca/worker'

const URL = 'https://api.deepseek.com/user/balance'
const SYMBOL: Record<string, string> = { USD: '$', CNY: '¥' }

type Balance = { currency?: string; total_balance?: string }
type Payload = { is_available?: boolean; balance_infos?: Balance[] }

async function fetchCredit(key: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(URL, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
      signal: controller.signal
    })
    if (res.status === 401 || res.status === 403) throw new Error('Neplatný API klíč')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as Payload
    const infos = (data.balance_infos ?? []).filter((b) => b.currency)
    if (infos.length === 0) throw new Error('Neočekávaná odpověď')
    // Prefer USD alone, like the tray app; otherwise show every currency.
    const shown = infos.some((b) => b.currency === 'USD') ? infos.filter((b) => b.currency === 'USD') : infos
    return shown
      .map((b) => {
        const cur = String(b.currency).toUpperCase()
        const amount = Number(b.total_balance)
        const text = Number.isFinite(amount) ? amount.toFixed(2) : '?'
        return SYMBOL[cur] ? `${SYMBOL[cur]}${text}` : `${text} ${cur}`
      })
      .join(' · ')
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
    const settings = (await orca.settings.get()) as { apiKey?: unknown }
    const key = typeof settings.apiKey === 'string' ? settings.apiKey.trim() : ''
    if (!key) return show('DeepSeek: nastav klíč', 'Zadej API klíč v nastavení pluginu', true)
    try {
      const credit = await fetchCredit(key)
      await show(`DeepSeek ${credit}`, `Kredit DeepSeek: ${credit}\nKlikni pro obnovení`, false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await show('DeepSeek !', `Nepodařilo se načíst kredit: ${msg}`, true)
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
