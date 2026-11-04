const list = document.getElementById('list')
const search = document.getElementById('search')
const count = document.getElementById('count')
let items = []

function dateLabel(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}

function button(label, title, click) {
  const element = document.createElement('button')
  element.textContent = label
  element.title = title
  element.addEventListener('click', (event) => {
    event.stopPropagation()
    click()
  })
  return element
}

function render() {
  const query = search.value.trim().toLowerCase()
  const visible = items.filter((item) =>
    (item.preview || item.text || '').toLowerCase().includes(query)
  )
  count.textContent = items.length + ' 条'
  list.replaceChildren()
  if (!visible.length) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = query ? '没有匹配结果' : '暂无剪贴板记录'
    list.append(empty)
    return
  }
  for (const item of visible) {
    const row = document.createElement('div')
    row.className = 'item'
    const thumb = item.type === 'image' ? document.createElement('img') : document.createElement('div')
    thumb.className = 'thumb' + (item.type === 'text' ? ' type' : '')
    if (item.type === 'image') thumb.src = item.imageDataUrl
    else thumb.textContent = '文'
    const info = document.createElement('div')
    info.className = 'info'
    const preview = document.createElement('div')
    preview.className = 'preview'
    preview.textContent = item.preview || item.text || ''
    const meta = document.createElement('div')
    meta.className = 'meta'
    meta.textContent = (item.type === 'image' ? '图片' : '文字') + ' · ' + dateLabel(item.createdAt)
    info.append(preview, meta)
    info.addEventListener('click', () => copy(item))
    const actions = document.createElement('div')
    actions.className = 'actions'
    actions.append(button('复制', '复制到剪贴板', () => copy(item)))
    if (item.type === 'image') {
      actions.append(button('贴图', '打开贴图', async () => {
        await window.shot.invoke('history:pin', item.id)
      }))
    }
    actions.append(button('删除', '删除这条记录', async () => {
      await window.shot.invoke('history:delete', item.id)
      await reload()
    }))
    row.append(thumb, info, actions)
    list.append(row)
  }
}

async function copy(item) {
  const copied = await window.shot.invoke('history:copy', item.id)
  if (copied) {
    window.shot.send('window:close')
  }
}

async function reload() {
  items = await window.shot.invoke('history:list')
  render()
}

search.addEventListener('input', render)
document.getElementById('clear').addEventListener('click', async () => {
  if (!items.length || !confirm('确定清空全部剪贴板历史吗？')) return
  await window.shot.invoke('history:clear')
  await reload()
})
document.getElementById('close').addEventListener('click', () => window.shot.send('window:close'))
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.shot.send('window:close')
})
window.shot.on('history:updated', reload)
reload().then(() => search.focus())
