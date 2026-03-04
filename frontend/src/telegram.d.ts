interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    start_param?: string
    user?: { id: number; first_name: string; username?: string; photo_url?: string }
  }
  ready(): void
  expand(): void
  openTelegramLink(url: string): void
  onEvent(event: string, callback: () => void): void
  offEvent(event: string, callback: () => void): void
  MainButton: { hide(): void; show(): void }
  colorScheme?: string
  themeParams?: Record<string, string>
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}
