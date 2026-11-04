const background = document.getElementById('background')
const marks = document.getElementById('marks')
const shade = document.getElementById('shade')
const selectionBox = document.getElementById('selection')
const toolbar = document.getElementById('toolbar')
const textEntry = document.getElementById('text-entry')
const colorInput = document.getElementById('color')
const backgroundCtx = background.getContext('2d')
const marksCtx = marks.getContext('2d')

let selection = null
let tool = 'select'
let drag = null
let operations = []
let pendingText = null
let number = 1
let busy = false

function point(event) {
  return {
    x: Math.max(0, Math.min(innerWidth, event.clientX)),
    y: Math.max(0, Math.min(innerHeight, event.clientY))
  }
}

function bounds(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y)
  }
}

function inside(p) {
  return selection && p.x >= selection.x && p.y >= selection.y &&
    p.x <= selection.x + selection.width && p.y <= selection.y + selection.height
}

function displaySelection() {
  if (!selection || selection.width < 5 || selection.height < 5) {
    selectionBox.hidden = true
    toolbar.hidden = true
    shade.style.background = 'rgba(0,0,0,.35)'
    return
  }
  shade.style.background = 'transparent'
  selectionBox.hidden = false
  selectionBox.style.left = selection.x + 'px'
  selectionBox.style.top = selection.y + 'px'
  selectionBox.style.width = selection.width + 'px'
  selectionBox.style.height = selection.height + 'px'
  toolbar.hidden = false
  const rect = toolbar.getBoundingClientRect()
  const toolbarX = Math.max(8, Math.min(innerWidth - rect.width - 8, selection.x))
  const below = selection.y + selection.height + 8
  const toolbarY = below + rect.height < innerHeight
    ? below : Math.max(8, selection.y - rect.height - 8)
  toolbar.style.left = toolbarX + 'px'
  toolbar.style.top = toolbarY + 'px'
}

function drawOperation(ctx, op) {
  ctx.save()
  ctx.strokeStyle = op.color
  ctx.fillStyle = op.color
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (op.tool === 'pen') {
    ctx.beginPath()
    op.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))
    ctx.stroke()
  } else if (op.tool === 'rect') {
    const b = bounds(op.start, op.end)
    ctx.strokeRect(b.x, b.y, b.width, b.height)
  } else if (op.tool === 'arrow') {
    const dx = op.end.x - op.start.x
    const dy = op.end.y - op.start.y
    const angle = Math.atan2(dy, dx)
    ctx.beginPath()
    ctx.moveTo(op.start.x, op.start.y)
    ctx.lineTo(op.end.x, op.end.y)
    ctx.moveTo(op.end.x, op.end.y)
    ctx.lineTo(op.end.x - 13 * Math.cos(angle - .55), op.end.y - 13 * Math.sin(angle - .55))
    ctx.moveTo(op.end.x, op.end.y)
    ctx.lineTo(op.end.x - 13 * Math.cos(angle + .55), op.end.y - 13 * Math.sin(angle + .55))
    ctx.stroke()
  } else if (op.tool === 'number') {
    ctx.beginPath()
    ctx.arc(op.start.x, op.start.y, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(op.number), op.start.x, op.start.y)
  } else if (op.tool === 'tag') {
    ctx.font = 'bold 16px sans-serif'
    const lines = op.text.split('\n')
    const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 18
    const height = lines.length * 22 + 10
    ctx.beginPath()
    ctx.moveTo(op.start.x, op.start.y + 12)
    ctx.lineTo(op.start.x + 11, op.start.y)
    ctx.lineTo(op.start.x + width, op.start.y)
    ctx.lineTo(op.start.x + width, op.start.y + height)
    ctx.lineTo(op.start.x + 11, op.start.y + height)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    lines.forEach((line, index) => ctx.fillText(line, op.start.x + 15, op.start.y + 24 + index * 22))
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(op.start.x + 10, op.start.y + 10, 2, 0, Math.PI * 2)
    ctx.fill()
  } else if (op.tool === 'text') {
    ctx.font = 'bold 18px sans-serif'
    ctx.textBaseline = 'top'
    op.text.split('\n').forEach((line, index) => {
      ctx.fillText(line, op.start.x, op.start.y + index * 24)
    })
  }
  ctx.restore()
}

function render() {
  const dpr = devicePixelRatio || 1
  marksCtx.setTransform(1, 0, 0, 1, 0, 0)
  marksCtx.clearRect(0, 0, marks.width, marks.height)
  marksCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  for (const op of operations) drawOperation(marksCtx, op)
  if (drag?.operation) drawOperation(marksCtx, drag.operation)
}

function setTool(value) {
  commitText()
  tool = value
  document.querySelectorAll('[data-tool]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === value)
  })
}

function commitText() {
  if (!pendingText) return
  const value = textEntry.value.trim()
  if (value) {
    operations.push({
      tool: pendingText.tool,
      start: pendingText.point,
      text: value,
      color: colorInput.value
    })
    render()
  }
  pendingText = null
  textEntry.hidden = true
  textEntry.value = ''
}

function startText(p) {
  commitText()
  pendingText = { tool, point: p }
  textEntry.hidden = false
  textEntry.style.left = Math.min(p.x, innerWidth - 160) + 'px'
  textEntry.style.top = Math.min(p.y, innerHeight - 50) + 'px'
  textEntry.focus()
}

marks.addEventListener('pointerdown', (event) => {
  if (busy) return
  const p = point(event)
  if (tool === 'select' || !selection) {
    commitText()
    selection = { x: p.x, y: p.y, width: 0, height: 0 }
    operations = []
    number = 1
    drag = { tool: 'select', start: p }
    displaySelection()
    render()
  } else if (inside(p)) {
    if (tool === 'text' || tool === 'tag') {
      startText(p)
      return
    }
    if (tool === 'number') {
      operations.push({ tool, start: p, number: number++, color: colorInput.value })
      render()
      return
    }
    drag = {
      tool,
      start: p,
      operation: { tool, start: p, end: p, points: [p], color: colorInput.value }
    }
  }
  if (drag) marks.setPointerCapture(event.pointerId)
})

marks.addEventListener('pointermove', (event) => {
  if (!drag) return
  const p = point(event)
  if (drag.tool === 'select') {
    selection = bounds(drag.start, p)
    displaySelection()
  } else {
    drag.operation.end = p
    if (drag.tool === 'pen') drag.operation.points.push(p)
    render()
  }
})

marks.addEventListener('pointerup', () => {
  if (!drag) return
  if (drag.operation) operations.push(drag.operation)
  drag = null
  displaySelection()
  render()
})

textEntry.addEventListener('blur', () => setTimeout(commitText, 0))
textEntry.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    commitText()
  }
  if (event.key === 'Escape') {
    event.stopPropagation()
    pendingText = null
    textEntry.hidden = true
  }
})

async function outputData() {
  commitText()
  if (!selection) return null
  const dpr = devicePixelRatio || 1
  const result = document.createElement('canvas')
  result.width = Math.max(1, Math.round(selection.width * dpr))
  result.height = Math.max(1, Math.round(selection.height * dpr))
  const ctx = result.getContext('2d')
  const sx = Math.round(selection.x * dpr)
  const sy = Math.round(selection.y * dpr)
  ctx.drawImage(background, sx, sy, result.width, result.height, 0, 0, result.width, result.height)
  ctx.drawImage(marks, sx, sy, result.width, result.height, 0, 0, result.width, result.height)
  return result.toDataURL('image/png')
}

async function finish(action) {
  if (busy) return
  busy = true
  try {
    const data = await outputData()
    if (!data) return
    const extra = action === 'pin'
      ? [{ x: Math.round(selection.x), y: Math.round(selection.y) }]
      : []
    const result = await window.shot.invoke('capture:' + action, data, ...extra)
    if (result === false) alert('操作失败，请重试')
  } catch (error) {
    alert('操作失败：' + error.message)
  } finally {
    busy = false
  }
}

document.querySelectorAll('[data-tool]').forEach((button) => {
  button.addEventListener('click', () => setTool(button.dataset.tool))
})
document.getElementById('undo').addEventListener('click', () => {
  commitText()
  operations.pop()
  render()
})
for (const action of ['copy', 'save', 'pin']) {
  document.getElementById(action).addEventListener('click', () => finish(action))
}
document.getElementById('close').addEventListener('click', () => window.shot.send('window:close'))
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.activeElement !== textEntry) {
    window.shot.send('window:close')
  }
})

async function init() {
  const capture = await window.shot.invoke('capture:data')
  if (!capture?.dataUrl) throw new Error('截图数据不可用')
  const image = new Image()
  image.src = capture.dataUrl
  await image.decode()
  const dpr = devicePixelRatio || 1
  background.width = marks.width = Math.round(innerWidth * dpr)
  background.height = marks.height = Math.round(innerHeight * dpr)
  backgroundCtx.drawImage(image, 0, 0, background.width, background.height)
  setTool('select')
}

init().catch((error) => alert('截图无法加载：' + error.message))
