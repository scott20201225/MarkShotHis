import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, nativeTheme, Tray } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { isDarkThemeId } from '../common/theme'
import { getClipboardService } from './clipboard'
import { registerClipboardIpcHandlers } from './ipc/clipboard'
import { getCaptureWindowManager } from './windows/captureWindow'
import { getClipboardModalWindow } from './windows/clipboardModal'

const lock = app.requestSingleInstanceLock()
if (!lock) app.quit()

let tray: Tray | null = null

function trayIcon(): Electron.NativeImage {
  const size = 18
  const pixels = Buffer.alloc(size * size * 4)
  const dot = (x: number, y: number) => {
    const offset = (y * size + x) * 4
    pixels[offset + 3] = 255
  }
  for (let y = 3; y <= 14; y++) {
    for (let x = 3; x <= 14; x++) {
      if (x === 3 || x === 14 || y === 3 || y === 14) dot(x, y)
    }
  }
  for (let y = 7; y <= 11; y++) {
    for (let x = 7; x <= 11; x++) {
      if (Math.abs(x - 9) + Math.abs(y - 9) <= 2) dot(x, y)
    }
  }
  const icon = nativeImage.createFromBitmap(pixels, { width: size, height: size })
  if (process.platform === 'darwin') icon.setTemplateImage(true)
  return icon
}

interface UiSettings { theme: string; language: string }
const languages = new Set(['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'de', 'fr', 'es'])
const languageOptions = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' }
]
const trayLabels: Record<string, [string, string, string, string, string, string, string]> = {
  'zh-CN': ['截图', '剪贴板历史', '皮肤', '浅色', '深色', '语言', '退出 MarkShotHis'],
  'zh-TW': ['截圖', '剪貼簿歷史', '主題', '淺色', '深色', '語言', '退出 MarkShotHis'],
  en: ['Capture', 'Clipboard history', 'Theme', 'Light', 'Dark', 'Language', 'Quit MarkShotHis'],
  ja: ['スクリーンショット', 'クリップボード履歴', 'テーマ', 'ライト', 'ダーク', '言語', 'MarkShotHis を終了'],
  ko: ['스크린샷', '클립보드 기록', '테마', '라이트', '다크', '언어', 'MarkShotHis 종료'],
  de: ['Screenshot', 'Zwischenablageverlauf', 'Design', 'Hell', 'Dunkel', 'Sprache', 'MarkShotHis beenden'],
  fr: ['Capture', 'Historique du presse-papiers', 'Thème', 'Clair', 'Sombre', 'Langue', 'Quitter MarkShotHis'],
  es: ['Captura', 'Historial del portapapeles', 'Tema', 'Claro', 'Oscuro', 'Idioma', 'Salir de MarkShotHis']
}

function readPreferences(): UiSettings {
  const prefsPath = path.join(app.getPath('appData'), 'marknotepro', 'preferences.json')
  let settings: UiSettings = {
    theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    language: 'zh-CN'
  }
  try {
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'))
    settings = {
      theme: typeof prefs.theme === 'string' ? prefs.theme : settings.theme,
      language: languages.has(prefs.language) ? prefs.language : settings.language
    }
  } catch {}
  try {
    const own = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'settings.json'), 'utf8'))
    if (own.theme === 'light' || own.theme === 'dark') settings.theme = own.theme
    if (languages.has(own.language)) settings.language = own.language
  } catch {}
  return settings
}

function savePreferences(changes: Partial<UiSettings>): UiSettings {
  const settings = readPreferences()
  if (changes.theme === 'light' || changes.theme === 'dark') settings.theme = changes.theme
  if (changes.language && languages.has(changes.language)) settings.language = changes.language
  const file = path.join(app.getPath('userData'), 'settings.json')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(settings), 'utf8')
  fs.renameSync(`${file}.tmp`, file)
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('mt::user-preference', settings)
  }
  refreshTrayMenu(settings)
  return settings
}

function refreshTrayMenu(settings: UiSettings): void {
  if (!tray) return
  const [capture, history, theme, light, dark, language, quit] = trayLabels[settings.language] || trayLabels['zh-CN']
  const darkSelected = isDarkThemeId(settings.theme)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: capture, accelerator: 'Control+Shift+1', click: () => void getCaptureWindowManager().startCapture() },
    { label: history, accelerator: 'Control+Shift+3', click: () => void getClipboardModalWindow().show() },
    { type: 'separator' },
    { label: theme, submenu: [
      { label: light, type: 'radio', checked: !darkSelected, click: () => savePreferences({ theme: 'light' }) },
      { label: dark, type: 'radio', checked: darkSelected, click: () => savePreferences({ theme: 'dark' }) }
    ] },
    { label: language, submenu: languageOptions.map(({ code, label }) => ({
      label,
      type: 'radio' as const,
      checked: settings.language === code,
      click: () => savePreferences({ language: code })
    })) },
    { type: 'separator' },
    { label: quit, click: () => app.quit() }
  ]))
}

function createTray(): void {
  tray = new Tray(trayIcon())
  tray.setToolTip('MarkShotHis')
  refreshTrayMenu(readPreferences())
  if (process.platform !== 'darwin') tray.on('click', () => getClipboardModalWindow().toggle())
}

if (lock) {
  app.on('second-instance', () => getClipboardModalWindow().show())
  app.whenReady().then(() => {
    if (process.platform === 'darwin') app.dock?.hide()
    registerClipboardIpcHandlers()
    getClipboardService()
    ipcMain.on('mt::ask-for-user-preference', (event) => {
      event.sender.send('mt::user-preference', readPreferences())
    })
    ipcMain.handle('mt::set-user-preference', (_event, changes: Partial<UiSettings>) => savePreferences(changes))
    createTray()
    const shortcuts: Array<[string, () => void]> = [
      ['Control+Shift+1', () => void getCaptureWindowManager().startCapture()],
      ['Control+Shift+3', () => getClipboardModalWindow().toggle()]
    ]
    for (const [accelerator, action] of shortcuts) {
      if (!globalShortcut.register(accelerator, action)) {
        console.warn('[MarkShotHis] Shortcut unavailable:', accelerator)
      }
    }
  })
  app.on('window-all-closed', () => {})
  app.on('before-quit', () => {
    globalShortcut.unregisterAll()
    getClipboardService().stopMonitoring()
  })
}
