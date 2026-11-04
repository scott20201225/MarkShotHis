const { contextBridge, ipcRenderer } = require('electron')

const allowedInvoke = new Set([
  'history:list', 'history:copy', 'history:delete', 'history:clear',
  'history:pin', 'capture:data', 'capture:copy', 'capture:save',
  'capture:pin', 'pin:data', 'pin:copy', 'pin:save'
])
const allowedSend = new Set(['window:close', 'pin:resize', 'pin:move'])
const allowedEvents = new Set(['history:updated'])

contextBridge.exposeInMainWorld('shot', {
  invoke(channel, ...args) {
    if (!allowedInvoke.has(channel)) throw new Error('不允许的调用')
    return ipcRenderer.invoke(channel, ...args)
  },
  send(channel, ...args) {
    if (!allowedSend.has(channel)) throw new Error('不允许的消息')
    ipcRenderer.send(channel, ...args)
  },
  on(channel, callback) {
    if (!allowedEvents.has(channel)) throw new Error('不允许的事件')
    const listener = (_event, ...args) => callback(...args)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
})
