import { createApp } from 'vue'
import './global.css'
import ScreenCapture from './pages/screenCapture.vue'
import ClipboardModal from './pages/clipboardModal.vue'
import PinWindow from './pages/pinWindow.vue'
import PinToolbar from './pages/pinToolbar.vue'

const route = window.location.hash.replace(/^#\//, '').split('?')[0]
const pages = {
  capture: ScreenCapture,
  clipboard: ClipboardModal,
  pin: PinWindow,
  'pin-toolbar': PinToolbar
}
createApp(pages[route as keyof typeof pages] || ClipboardModal).mount('#app')
