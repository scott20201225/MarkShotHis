const image = document.getElementById('image')
const wrap = document.getElementById('image-wrap')
const marks = document.getElementById('marks')
const ctx = marks.getContext('2d')
const entry = document.getElementById('text-entry')
const tools = document.getElementById('edit-tools')
const color = document.getElementById('color')
let dataUrl = null
let editing = false
let tool = 'pen'
let operations = []
let drag = null
let textPoint = null

function scale() {
  return image.naturalWidth / Math.max(1, image.clientWidth)
}

function point(event) {
  const box = marks.getBoundingClientRect()
  return {
    x: (event.clientX - box.left) * marks.width / box.width,
    y: (event.clientY - box.top) * marks.height / box.height
  }
}

function positionCanvas() {
  if (!image.naturalWidth) return
  const a = image.getBoundingClientRect()
  const b = wrap.getBoundingClientRect()
  marks.width = image.naturalWidth
  marks.height = image.naturalHeight
  marks.style.left = a.left - b.left + 'px'
  marks.style.top = a.top - b.top + 'px'
  marks.style.width = a.width + 'px'
  marks.style.height = a.height + 'px'
  render()
}

function draw(op) {
  ctx.save()
  ctx.lineWidth = Math.max(2, 3 * scale())
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = op.color
  ctx.fillStyle = op.color
  if (op.tool === 'pen') {
    ctx.beginPath()
    op.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))
    ctx.stroke()
  } else if (op.tool === 'rect') {
    const x = Math.min(op.start.x, op.end.x)
    const y = Math.min(op.start.y, op.end.y)
    ctx.strokeRect(x, y, Math.abs(op.end.x - op.start.x), Math.abs(op.end.y - op.start.y))
  } else if (op.tool === 'text') {
    ctx.font = 'bold ' + Math.round(18 * scale()) + 'px sans-serif'
    ctx.textBaseline = 'top'
    op.text.split('\n').forEach((line, i) => {
      ctx.fillText(line, op.start.x, op.start.y + i * 24 * scale())
    })
  }
  ctx.restore()
}

function render() {
  ctx.clearRect(0, 0, marks.width, marks.height)
  operations.forEach(draw)
  if (drag) draw(drag)
}

function commitText() {
  if (!textPoint) return
  const value = entry.value.trim()
  if (value) {
    operations.push({ tool: 'text', start: textPoint, text: value, color: color.value })
    render()
  }
  textPoint = null
  entry.value = ''
  entry.hidden = true
}

function setTool(value) {
  commitText()
  tool = value
  document.querySelectorAll('[data-tool]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === value)
  })
}

marks.addEventListener('pointerdown', (event) => {
  if (!editing) return
  const p = point(event)
  if (tool === 'text') {
    commitText()
    textPoint = p
    entry.hidden = false
    const a = marks.getBoundingClientRect()
    const b = wrap.getBoundingClientRect()
    entry.style.left = Math.min(a.left - b.left + event.offsetX, wrap.clientWidth - 130) + 'px'
    entry.style.top = Math.min(a.top - b.top + event.offsetY, wrap.clientHeight - 50) + 'px'
    entry.focus()
    return
  }
  drag = { tool, start: p, end: p, points: [p], color: color.value }
  marks.setPointerCapture(event.pointerId)
})
marks.addEventListener('pointermove', (event) => {
  if (!drag) return
  const p = point(event)
  drag.end = p
  if (tool === 'pen') drag.points.push(p)
  render()
})
marks.addEventListener('pointerup', () => {
  if (!drag) return
  operations.push(drag)
  drag = null
  render()
})
entry.addEventListener('blur', () => setTimeout(commitText, 0))
entry.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    commitText()
  }
  if (event.key === 'Escape') {
    event.stopPropagation()
    textPoint = null
    entry.hidden = true
  }
})

function composedImage() {
  commitText()
  if (!operations.length) return dataUrl
  const output = document.createElement('canvas')
  output.width = image.naturalWidth
  output.height = image.naturalHeight
  const outputCtx = output.getContext('2d')
  outputCtx.drawImage(image, 0, 0)
  outputCtx.drawImage(marks, 0, 0)
  return output.toDataURL('image/png')
}

document.getElementById('edit').addEventListener('click', () => {
  commitText()
  editing = !editing
  marks.classList.toggle('editing', editing)
  tools.hidden = !editing
  document.getElementById('edit').classList.toggle('primary', editing)
  positionCanvas()
})
document.querySelectorAll('[data-tool]').forEach((button) => {
  button.addEventListener('click', () => setTool(button.dataset.tool))
})
document.getElementById('undo').addEventListener('click', () => {
  commitText()
  operations.pop()
  render()
})
document.getElementById('close').addEventListener('click', () => window.shot.send('window:close'))
document.getElementById('copy').addEventListener('click', async () => {
  await window.shot.invoke('pin:copy', composedImage())
})
document.getElementById('save').addEventListener('click', async () => {
  await window.shot.invoke('pin:save', composedImage())
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.activeElement !== entry) window.shot.send('window:close')
})
new ResizeObserver(positionCanvas).observe(wrap)
window.shot.invoke('pin:data').then((value) => {
  dataUrl = value
  if (value) image.src = value
})
image.addEventListener('load', positionCanvas)
setTool('pen')
