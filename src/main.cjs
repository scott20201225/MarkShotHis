const {
  app, BrowserWindow, Tray, Menu, nativeImage, nativeTheme,
  globalShortcut, screen, desktopCapturer, clipboard, dialog, ipcMain
} = require('electron')
const { spawn } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const MAX_ITEMS = 200
const MAX_STORAGE_BYTES = 300 * 1024 * 1024
const POLL_MS = 1500
const shortcuts = {
  capture: [
    'Control+Shift+1'
  ],
  history: [
    'Control+Shift+F3',
    'Command+Shift+F3',
    'CommandOrControl+Shift+F3',
    'Control+Shift+3'
  ]
}
const windows = { capture: null, history: null }
const pins = new Map()
let tray = null
let history = []
let clipboardFingerprint = ''
let pollBusy = false
let currentCapture = null
let quitting = false

const dataDir = () => path.join(app.getPath('userData'), 'clipboard')
const imagesDir = () => path.join(dataDir(), 'images')
const historyPath = () => path.join(dataDir(), 'history.json')
const pagePath = (name) => path.join(__dirname, 'ui', name + '.html')

function trayImage() {
  const size = 18
  const bitmap = Buffer.alloc(size * size * 4)
  const pixel = (x, y) => {
    const i = (y * size + x) * 4
    bitmap[i] = 0
    bitmap[i + 1] = 0
    bitmap[i + 2] = 0
    bitmap[i + 3] = 255
  }
  for (let y = 3; y <= 14; y++) {
    for (let x = 3; x <= 14; x++) {
      if (x === 3 || x === 14 || y === 3 || y === 14) pixel(x, y)
    }
  }
  for (let y = 7; y <= 11; y++) {
    for (let x = 7; x <= 11; x++) {
      if (Math.abs(x - 9) + Math.abs(y - 9) <= 2) pixel(x, y)
    }
  }
  const image = nativeImage.createFromBitmap(bitmap, { width: size, height: size })
  if (process.platform === 'darwin') image.setTemplateImage(true)
  return image
}

function windowOptions(bounds, extra = {}) {
  return {
    ...bounds,
    frame: false,
    show: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#161a1d' : '#f6f7f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    },
    ...extra
  }
}

function showAcrossSpaces(win, level = 'floating') {
  if (process.platform === 'darwin') {
    win.setAlwaysOnTop(true, level)
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    })
  }
}

function focusWindow(win) {
  if (!win || win.isDestroyed()) return
  if (process.platform === 'darwin') app.focus({ steal: true })
  win.show()
  win.focus()
}

async function loadHistory() {
  await fsp.mkdir(imagesDir(), { recursive: true })
  try {
    const parsed = JSON.parse(await fsp.readFile(historyPath(), 'utf8'))
    if (Array.isArray(parsed)) history = parsed.slice(0, MAX_ITEMS)
  } catch {
    history = []
  }
}

async function persistHistory() {
  const temp = historyPath() + '.tmp'
  await fsp.writeFile(temp, JSON.stringify(history), 'utf8')
  await fsp.rename(temp, historyPath())
  if (windows.history && !windows.history.isDestroyed()) {
    windows.history.webContents.send('history:updated')
  }
}

async function pruneHistory() {
  const removed = history.splice(MAX_ITEMS)
  let total = history.reduce((sum, item) => sum + (item.bytes || 0), 0)
  while (total > MAX_STORAGE_BYTES && history.length) {
    const item = history.pop()
    total -= item.bytes || 0
    removed.push(item)
  }
  for (const item of removed) {
    if (item.imageFile) await fsp.unlink(path.join(imagesDir(), item.imageFile)).catch(() => {})
  }
}

async function addText(text) {
  if (!text || !text.trim()) return
  const hash = crypto.createHash('sha256').update(text).digest('hex')
  if (history[0]?.hash === hash) return
  history.unshift({
    id: crypto.randomUUID(), type: 'text', text,
    hash, createdAt: Date.now(), preview: text.replace(/\s+/g, ' ').slice(0, 140)
  })
  await pruneHistory()
  await persistHistory()
}

async function addImage(image) {
  if (image.isEmpty()) return
  const { width, height } = image.getSize()
  if (width * height > 25000000) return
  const png = image.toPNG()
  if (png.length > 20000000) return
  const hash = crypto.createHash('sha256').update(png).digest('hex')
  if (history[0]?.hash === hash) return
  const imageFile = crypto.randomUUID() + '.png'
  await fsp.writeFile(path.join(imagesDir(), imageFile), png)
  history.unshift({
    id: crypto.randomUUID(), type: 'image', imageFile,
    hash, width, height, bytes: png.length, createdAt: Date.now(),
    preview: width + ' × ' + height + ' 图片'
  })
  await pruneHistory()
  await persistHistory()
}

async function pollClipboard() {
  if (pollBusy) return
  pollBusy = true
  try {
    const formats = clipboard.availableFormats()
    const imageFormat = formats.some((format) =>
      format.startsWith('image/') ||
      ['public.tiff', 'public.png', 'public.jpeg', 'CF_DIB', 'CF_BITMAP'].includes(format)
    )
    if (imageFormat) {
      const image = clipboard.readImage()
      if (!image.isEmpty()) {
        const size = image.getSize()
        const small = image.resize({ width: 16, height: 16 }).toBitmap()
        const fingerprint = crypto.createHash('sha1').update(small)
          .update(size.width + ':' + size.height).digest('hex')
        if (clipboardFingerprint !== 'image:' + fingerprint) {
          clipboardFingerprint = 'image:' + fingerprint
          await addImage(image)
        }
        return
      }
    }
    const value = clipboard.readText()
    const fingerprint = 'text:' + crypto.createHash('sha1').update(value).digest('hex')
    if (clipboardFingerprint !== fingerprint) {
      clipboardFingerprint = fingerprint
      await addText(value)
    }
  } catch (error) {
    console.error('[clipboard]', error)
  } finally {
    pollBusy = false
  }
}

async function captureDisplay(display) {
  if (process.platform === 'darwin') {
    const file = path.join(os.tmpdir(), 'markshothis-' + crypto.randomUUID() + '.png')
    const b = display.bounds
    const region = [b.x, b.y, b.width, b.height].join(',')
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('/usr/sbin/screencapture', ['-x', '-R' + region, file])
        child.once('error', reject)
        child.once('close', (code) => code === 0 ? resolve() : reject(new Error('screencapture ' + code)))
      })
      return 'data:image/png;base64,' + (await fsp.readFile(file)).toString('base64')
    } catch (error) {
      console.warn('[capture] macOS native capture failed', error)
    } finally {
      await fsp.unlink(file).catch(() => {})
    }
  }
  const b = display.bounds
  const scale = display.scaleFactor || 1
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(b.width * scale),
      height: Math.round(b.height * scale)
    }
  })
  const target = sources.find((source) => source.display_id === String(display.id))
    || sources[screen.getAllDisplays().findIndex((item) => item.id === display.id)]
    || sources[0]
  if (!target || target.thumbnail.isEmpty()) {
    throw new Error('未获取到屏幕画面，请检查屏幕录制权限')
  }
  return target.thumbnail.toDataURL()
}

async function openCapture() {
  if (windows.capture && !windows.capture.isDestroyed()) {
    focusWindow(windows.capture)
    return
  }
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  let dataUrl
  try {
    dataUrl = await captureDisplay(display)
  } catch (error) {
    dialog.showErrorBox('截图失败', String(error.message || error))
    return
  }
  currentCapture = { dataUrl, bounds: display.bounds }
  const win = new BrowserWindow(windowOptions(display.bounds, {
    resizable: false,
    movable: false,
    type: process.platform === 'darwin' ? 'panel' : undefined,
    backgroundColor: '#000000'
  }))
  windows.capture = win
  showAcrossSpaces(win, 'status')
  win.on('closed', () => {
    if (windows.capture === win) windows.capture = null
    currentCapture = null
  })
  await win.loadFile(pagePath('capture'))
  focusWindow(win)
}

async function openHistory() {
  if (windows.history && !windows.history.isDestroyed()) {
    focusWindow(windows.history)
    return
  }
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const area = display.workArea
  const width = Math.min(760, area.width)
  const height = Math.min(530, area.height)
  const win = new BrowserWindow(windowOptions({
    width, height,
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2)
  }, {
    type: process.platform === 'darwin' ? 'panel' : undefined,
    resizable: false
  }))
  windows.history = win
  showAcrossSpaces(win)
  win.on('closed', () => { if (windows.history === win) windows.history = null })
  await win.loadFile(pagePath('history'))
  focusWindow(win)
}

async function createPin(dataUrl, bounds) {
  const image = nativeImage.createFromDataURL(dataUrl)
  if (image.isEmpty()) return false
  const size = image.getSize()
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const area = display.workArea
  const maxWidth = Math.max(200, Math.min(900, area.width * 0.75))
  const maxHeight = Math.max(150, Math.min(700, area.height * 0.75))
  const ratio = Math.min(1, maxWidth / size.width, maxHeight / size.height)
  const width = Math.max(160, Math.round(size.width * ratio))
  const height = Math.max(120, Math.round(size.height * ratio)) + 44
  const x = bounds?.x ?? Math.round(area.x + (area.width - width) / 2)
  const y = bounds?.y ?? Math.round(area.y + (area.height - height) / 2)
  const win = new BrowserWindow(windowOptions({ width, height, x, y }, {
    type: process.platform === 'darwin' ? 'panel' : undefined,
    resizable: true,
    minWidth: 160,
    minHeight: 120
  }))
  pins.set(win.id, { win, dataUrl })
  showAcrossSpaces(win)
  win.on('closed', () => pins.delete(win.id))
  await win.loadFile(pagePath('pin'))
  focusWindow(win)
  return true
}

function imageFromItem(item) {
  if (!item || item.type !== 'image' || !item.imageFile) return null
  const file = path.join(imagesDir(), path.basename(item.imageFile))
  return fs.existsSync(file) ? nativeImage.createFromPath(file) : null
}

function registerIpc() {
  ipcMain.handle('history:list', () => history.map((item) => ({
    ...item,
    imageDataUrl: item.type === 'image'
      ? imageFromItem(item)?.resize({ width: 160 }).toDataURL() || ''
      : undefined
  })))
  ipcMain.handle('history:copy', async (_event, id) => {
    const item = history.find((entry) => entry.id === id)
    if (!item) return false
    if (item.type === 'text') clipboard.writeText(item.text)
    else {
      const image = imageFromItem(item)
      if (!image || image.isEmpty()) return false
      clipboard.writeImage(image)
    }
    return true
  })
  ipcMain.handle('history:delete', async (_event, id) => {
    const index = history.findIndex((item) => item.id === id)
    if (index < 0) return false
    const [item] = history.splice(index, 1)
    if (item.imageFile) await fsp.unlink(path.join(imagesDir(), item.imageFile)).catch(() => {})
    await persistHistory()
    return true
  })
  ipcMain.handle('history:clear', async () => {
    const old = history
    history = []
    for (const item of old) {
      if (item.imageFile) await fsp.unlink(path.join(imagesDir(), item.imageFile)).catch(() => {})
    }
    await persistHistory()
    return true
  })
  ipcMain.handle('history:pin', async (_event, id) => {
    const image = imageFromItem(history.find((item) => item.id === id))
    return image && !image.isEmpty() ? createPin(image.toDataURL()) : false
  })
  ipcMain.handle('capture:data', () => currentCapture)
  ipcMain.handle('capture:copy', async (_event, dataUrl) => {
    const image = nativeImage.createFromDataURL(dataUrl)
    if (image.isEmpty()) return false
    clipboard.writeImage(image)
    await addImage(image)
    windows.capture?.close()
    return true
  })
  ipcMain.handle('capture:save', async (event, dataUrl) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(win, {
      title: '保存截图',
      defaultPath: 'screenshot_' + Date.now() + '.png',
      filters: [{ name: 'PNG 图片', extensions: ['png'] }]
    })
    if (result.canceled || !result.filePath) return null
    const image = nativeImage.createFromDataURL(dataUrl)
    if (image.isEmpty()) return null
    await fsp.writeFile(result.filePath, image.toPNG())
    await addImage(image)
    windows.capture?.close()
    return result.filePath
  })
  ipcMain.handle('capture:pin', async (_event, dataUrl, bounds) => {
    const origin = currentCapture?.bounds || { x: 0, y: 0 }
    const pinBounds = bounds
      ? { x: origin.x + bounds.x, y: origin.y + bounds.y }
      : undefined
    const created = await createPin(dataUrl, pinBounds)
    if (created) {
      await addImage(nativeImage.createFromDataURL(dataUrl))
      windows.capture?.close()
    }
    return created
  })
  ipcMain.handle('pin:data', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return pins.get(win?.id)?.dataUrl || null
  })
  ipcMain.handle('pin:copy', async (event, dataUrl) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const pin = pins.get(win?.id)
    if (!pin) return false
    const image = nativeImage.createFromDataURL(dataUrl || pin.dataUrl)
    clipboard.writeImage(image)
    await addImage(image)
    return true
  })
  ipcMain.handle('pin:save', async (event, dataUrl) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const pin = pins.get(win?.id)
    if (!pin) return null
    const result = await dialog.showSaveDialog(win, {
      title: '保存贴图',
      defaultPath: 'pinned_' + Date.now() + '.png',
      filters: [{ name: 'PNG 图片', extensions: ['png'] }]
    })
    if (result.canceled || !result.filePath) return null
    const image = nativeImage.createFromDataURL(dataUrl || pin.dataUrl)
    await fsp.writeFile(result.filePath, image.toPNG())
    return result.filePath
  })
  ipcMain.on('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close())
  ipcMain.on('pin:move', (event, dx, dy) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const [x, y] = win.getPosition()
    win.setPosition(Math.round(x + dx), Math.round(y + dy))
  })
}

function createTray() {
  tray = new Tray(trayImage())
  tray.setToolTip('MarkShotHis')
  const menu = Menu.buildFromTemplate([
    { label: '截图', accelerator: shortcuts.capture[0], click: openCapture },
    { label: '剪贴板历史', accelerator: shortcuts.history[0], click: openHistory },
    {
      label: '贴图（剪贴板图片）',
      click: () => {
        const image = clipboard.readImage()
        if (!image.isEmpty()) createPin(image.toDataURL())
      }
    },
    { type: 'separator' },
    { label: '退出 MarkShotHis', click: () => { quitting = true; app.quit() } }
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => tray.popUpContextMenu(menu))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => openHistory())
  app.whenReady().then(async () => {
    if (process.platform === 'darwin') app.dock.hide()
    await loadHistory()
    registerIpc()
    createTray()
    for (const [name, aliases] of Object.entries(shortcuts)) {
      const action = name === 'capture' ? openCapture : openHistory
      for (const shortcut of aliases) {
        if (globalShortcut.isRegistered(shortcut)) continue
        try {
          if (!globalShortcut.register(shortcut, action)) {
            console.warn('[shortcut] unavailable:', shortcut)
          }
        } catch (error) {
          console.warn('[shortcut] registration failed:', shortcut, error)
        }
      }
    }
    await pollClipboard()
    setInterval(pollClipboard, POLL_MS).unref()
  }).catch((error) => {
    dialog.showErrorBox('MarkShotHis 启动失败', String(error.stack || error))
    app.quit()
  })
  app.on('window-all-closed', () => { if (quitting) app.quit() })
  app.on('will-quit', () => globalShortcut.unregisterAll())
}
