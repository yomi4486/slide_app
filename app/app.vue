<template>
  <div class="keynote-bg keynote-flex">
    <SlideListMenu :slides="slides" :current="current" @goTo="goTo" />
    <main class="keynote-main main-flex">
      <div class="main-center">
        <div style="text-align:center; position:relative; width:100%; display:flex; flex-direction:column; align-items:center;">
          <div
            :style="{
              position: 'fixed',
              left: addBarX + 'px',
              top: addBarY + 'px',
              zIndex: 3000,
              cursor: addBarDragging ? 'move' : 'grab',
              userSelect: addBarDragging ? 'none' : 'auto',
            }"
            @mousedown="startAddBarDrag"
          >
            <AddBar @addElement="addElement"
                    @saveSlides="saveSlides"
                    @openSlides="openSlides"
                    @newSlides="newSlides"
                    @localSave="localSave"
            />
          </div>
          <div
            ref="canvasWrapper"
            style="position:relative; width:100%; aspect-ratio:16/9; margin:0 auto; background:transparent;"
          >
            <!-- ドラッグ選択用の矩形 -->
            <div v-if="dragSelect" :style="{
              position: 'absolute',
              left: Math.min(dragRect.x, dragRect.x + dragRect.w) + 'px',
              top: Math.min(dragRect.y, dragRect.y + dragRect.h) + 'px',
              width: Math.abs(dragRect.w) + 'px',
              height: Math.abs(dragRect.h) + 'px',
              background: '#1976d233',
              border: '2px dashed #1976d2',
              zIndex: 1000,
              pointerEvents: 'none',
            }"></div>
            <SlideCanvas
              :elements="slides[current].elements"
              :selectedElements="selectedElements"
              :selectElement="selectElement"
              :startDrag="startDrag"
              :startResize="startResize"
              :isEditingText="isEditingText"
              :startInlineEdit="startInlineEdit"
              :finishInlineEdit="finishInlineEdit"
              :inlineEditValue="inlineEditValue"
              @update:inlineEditValue="v => inlineEditValue = v"
              :inlineEditInput="inlineEditInput"
              :textElementStyle="textElementStyle"
              :elementStyle="elementStyle"
              :clearSelection="clearSelection"
              :dragSelect="dragSelect"
              :dragRect="dragRect"
              :canvasWrapper="canvasWrapper"
              :onCanvasMouseDown="onCanvasMouseDown"
              :onCanvasMouseMove="onCanvasMouseMove"
              :onCanvasMouseUp="onCanvasMouseUp"
              :canvasWidth="canvasWidth"
              :canvasHeight="canvasHeight"
            />
          </div>
        </div>
      </div>
      <ElementEditPanel
        v-if="selectedElements.length"
        :currentEls="currentEls"
        @removeElement="removeElement"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import SlideListMenu from '../components/SlideListMenu.vue'
import AddBar from '../components/AddBar.vue'
import SlideCanvas from '../components/SlideCanvas.vue'
import ElementEditPanel from '../components/ElementEditPanel.vue'

// 新しいスライドデータ構造
const slides = ref([
  {
    elements: [
      { type: 'image', content: 'https://placehold.jp/600x300.png', x: 80, y: 60, width: 320, height: 180 },
      { type: 'text', content: '1枚目のスライド', x: 120, y: 270, width: 300, height: 60, fontSize: 32, color: '#222222' }
    ]
  },
  {
    elements: [
      { type: 'image', content: 'https://placehold.jp/600x300/ff7f7f/ffffff.png', x: 80, y: 60, width: 320, height: 180 },
      { type: 'text', content: '2枚目のスライド', x: 120, y: 270, width: 300, height: 60, fontSize: 32, color: '#222222' }
    ]
  },
  {
    elements: [
      { type: 'image', content: 'https://placehold.jp/600x300/7fbfff/333333.png', x: 80, y: 60, width: 320, height: 180 },
      { type: 'text', content: '3枚目のスライド', x: 120, y: 270, width: 300, height: 60, fontSize: 32, color: '#222222' }
    ]
  },
  {
    elements: [
      { type: 'text', content: '画像なしのテキストスライドもOK！', x: 120, y: 120, width: 400, height: 80, fontSize: 32, color: '#222222' }
    ]
  }
])
const current = ref(0)
// Undo/Redo用履歴
const history = ref([])
const redoStack = ref([])
function pushHistory() {
  history.value.push({
    slides: JSON.parse(JSON.stringify(slides.value)),
    current: current.value
  })
  // 履歴追加時はredoをクリア
  redoStack.value = []
}
function undo() {
  if (!history.value.length) return
  const last = history.value.pop()
  redoStack.value.push({
    slides: JSON.parse(JSON.stringify(slides.value)),
    current: current.value
  })
  slides.value = JSON.parse(JSON.stringify(last.slides))
  current.value = last.current
  selectedElements.value = []
}
function redo() {
  if (!redoStack.value.length) return
  const next = redoStack.value.pop()
  history.value.push({
    slides: JSON.parse(JSON.stringify(slides.value)),
    current: current.value
  })
  slides.value = JSON.parse(JSON.stringify(next.slides))
  current.value = next.current
  selectedElements.value = []
}
const canvasWrapper = ref(null)

// 画面いっぱいの16:9キャンバスサイズ計算
const canvasWidth = ref(1280)
const canvasHeight = ref(720)
function updateCanvasSize() {
  const sidebarWidth = 260; // サイドバーの実際の幅に合わせて調整
  const w = window.innerWidth - sidebarWidth;
  const cw = w;
  const ch = cw * 9 / 16;
  canvasWidth.value = Math.floor(cw);
  canvasHeight.value = Math.floor(ch);
}
onMounted(() => {
  const barWidth = 420
  const barHeight = 60
  const margin = 75
  addBarX.value = window.innerWidth - barWidth - margin - 255
  addBarY.value = window.innerHeight - barHeight - margin
  window.addEventListener('keydown', handleKeydown)
  // サイトを開いた時点でローカルデータ自動読込
  localLoad()
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateCanvasSize)
})

// 要素の選択・編集
const selectedElements = ref([]) // 複数選択対応
const clipboard = ref(null)
const currentEls = computed(() => {
  if (!selectedElements.value.length) return []
  return selectedElements.value.map(idx => slides.value[current.value].elements[idx])
})
function selectElement(i, multi = false) {
  if (multi) {
    if (!selectedElements.value.includes(i)) selectedElements.value.push(i)
  } else {
    selectedElements.value = [i]
  }
}
function removeElement() {
  pushHistory()
  if (selectedElements.value.length) {
    // 後ろから消す
    selectedElements.value.sort((a,b)=>b-a).forEach(idx => {
      slides.value[current.value].elements.splice(idx, 1)
    })
    selectedElements.value = []
  }
}

// 要素追加
function addElement(type) {
  pushHistory()
  const el = type === 'image'
    ? { type: 'image', content: '', x: 100, y: 100, width: 200, height: 120, shadow: false, background: '' }
    : { type: 'text', content: 'テキスト', x: 150, y: 150, width: 200, height: 60, fontSize: 32, color: '#222222', shadow: false, background: '' }
  slides.value[current.value].elements.push(el)
  selectedElement.value = slides.value[current.value].elements.length - 1
}

// スライド切り替え
function goTo(idx) {
  current.value = idx
  selectedElements.value = []
}

// ドラッグ移動
let dragInfo = null
function startDrag(i, e) {
  if (resizeInfo) return // リサイズ中は移動しない
  selectElement(i)
  pushHistory()
  dragInfo = {
    startX: e.clientX,
    startY: e.clientY,
    origX: slides.value[current.value].elements[i].x,
    origY: slides.value[current.value].elements[i].y,
    idx: i
  }
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}
function onDrag(e) {
  if (!dragInfo) return
  const dx = e.clientX - dragInfo.startX
  const dy = e.clientY - dragInfo.startY
  const el = slides.value[current.value].elements[dragInfo.idx]
  el.x = Math.max(0, dragInfo.origX + dx)
  el.y = Math.max(0, dragInfo.origY + dy)
}
function stopDrag() {
  dragInfo = null
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

// --- リサイズ処理 ---
let resizeInfo = null
function startResize(i, dir, e) {
  // pointerdown/mousedown両対応
  if (e.button !== undefined && e.button !== 0) return // 左クリックのみ
  console.log('startResize', {i, dir, e}) // 呼び出し確認
  selectElement(i)
  e.preventDefault()
  e.stopPropagation()
  const el = slides.value[current.value].elements[i]
  resizeInfo = {
    startX: e.clientX,
    startY: e.clientY,
    origX: el.x,
    origY: el.y,
    origW: el.width,
    origH: el.height,
    dir,
    idx: i
  }
  window.addEventListener('pointermove', onResize)
  window.addEventListener('pointerup', stopResize)
  // 互換性のため従来のmousemove/upも残す
  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
}
function onResize(e) {
  if (!resizeInfo) return
  pushHistory()
  const dx = e.clientX - resizeInfo.startX
  const dy = e.clientY - resizeInfo.startY
  const el = slides.value[current.value].elements[resizeInfo.idx]
  let { origX, origY, origW, origH, dir } = resizeInfo

  // 四隅のリサイズ対応
  if (dir === 'nw') {
    el.width = Math.max(20, origW - dx)
    el.x = origX + dx
    el.height = Math.max(20, origH - dy)
    el.y = origY + dy
  } else if (dir === 'ne') {
    el.width = Math.max(20, origW + dx)
    el.height = Math.max(20, origH - dy)
    el.y = origY + dy
  } else if (dir === 'sw') {
    el.width = Math.max(20, origW - dx)
    el.x = origX + dx
    el.height = Math.max(20, origH + dy)
  } else if (dir === 'se') {
    el.width = Math.max(20, origW + dx)
    el.height = Math.max(20, origH + dy)
  } else if (dir === 'n') {
    el.height = Math.max(20, origH - dy)
    el.y = origY + dy
  } else if (dir === 'e') {
    el.width = Math.max(20, origW + dx)
  } else if (dir === 's') {
    el.height = Math.max(20, origH + dy)
  } else if (dir === 'w') {
    el.width = Math.max(20, origW - dx)
    el.x = origX + dx
  }
}
function stopResize() {
  resizeInfo = null
  window.removeEventListener('pointermove', onResize)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
}

// --- インラインテキスト編集 ---
const inlineEditingIdx = ref(null)
const inlineEditValue = ref('')
const inlineEditInput = ref(null)
function isEditingText(idx) {
  return inlineEditingIdx.value === idx
}
function startInlineEdit(idx, value) {
  inlineEditingIdx.value = idx
  inlineEditValue.value = value
  nextTick(() => {
    if (inlineEditInput.value && inlineEditInput.value.focus) {
      inlineEditInput.value.focus()
      inlineEditInput.value.select()
    }
  })
}
function finishInlineEdit(apply) {
  if (inlineEditingIdx.value !== null) {
    if (apply) {
      pushHistory()
      slides.value[current.value].elements[inlineEditingIdx.value].content = inlineEditValue.value
    }
    inlineEditingIdx.value = null
    inlineEditValue.value = ''
  }
}
// --- ドラッグ一括選択 ---
const dragSelect = ref(false)
const dragRect = ref({x:0, y:0, w:0, h:0})
let dragStart = null
function getCanvasOffset(e) {
  const rect = canvasWrapper.value.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}
function onCanvasMouseDown(e) {
  if (e.button !== 0) return
  // キャンバスの空白でのみ発動（要素上はSlideCanvasでstopPropagationされる想定）
  dragSelect.value = true
  const {x, y} = getCanvasOffset(e)
  dragStart = { x, y }
  dragRect.value = { x, y, w: 0, h: 0 }
  window.addEventListener('mousemove', onCanvasMouseMove)
  window.addEventListener('mouseup', onCanvasMouseUp)
}
function onCanvasMouseMove(e) {
  if (!dragSelect.value) return
  const {x, y} = getCanvasOffset(e)
  dragRect.value.w = x - dragStart.x
  dragRect.value.h = y - dragStart.y
}
function onCanvasMouseUp(e) {
  if (!dragSelect.value) return
  dragSelect.value = false
  window.removeEventListener('mousemove', onCanvasMouseMove)
  window.removeEventListener('mouseup', onCanvasMouseUp)
  // 選択範囲内要素を選択
  const rx = Math.min(dragStart.x, dragStart.x + dragRect.value.w)
  const ry = Math.min(dragStart.y, dragStart.y + dragRect.value.h)
  const rw = Math.abs(dragRect.value.w)
  const rh = Math.abs(dragRect.value.h)
  const rRight = rx + rw
  const rBottom = ry + rh
  const selected = slides.value[current.value].elements
    .map((el, i) => {
      const ex = el.x, ey = el.y, ew = el.width, eh = el.height
      const eRight = ex + ew, eBottom = ey + eh
      // 2つの矩形が重なっているか
      if (!(eRight < rx || ex > rRight || eBottom < ry || ey > rBottom)) return i
      return null
    })
    .filter(i => i !== null)
  selectedElements.value = selected
}
// --- スタイル関数 ---
function elementStyle(el, idx) {
  return {
    position: 'absolute',
    left: el.x + 'px',
    top: el.y + 'px',
    width: el.width + 'px',
    height: el.height + 'px',
    zIndex: 10,
    cursor: 'move',
    border: selectedElements.value.includes(idx) ? '2px solid #007aff' : 'none',
    background: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none'
  }
}
function textElementStyle(el) {
  if (el.type !== 'text') return {}
  return {
    fontSize: (el.fontSize || 32) + 'px',
    color: el.color || '#222222',
    width: '100%',
    height: '100%',
    fontWeight: 600,
    textAlign: 'center',
    wordBreak: 'break-word',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    pointerEvents: 'none'
  }
}

// Deleteキーで要素削除
function handleKeydown(e) {
  // テキスト編集中やinput/textareaにフォーカス時は無視
  const tag = document.activeElement?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea') return
  // Undo: Cmd+Z / Ctrl+Z
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    undo()
    e.preventDefault()
    return
  }
  // Redo: Cmd+Shift+Z / Ctrl+Shift+Z
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
    redo()
    e.preventDefault()
    return
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElements.value.length) {
    removeElement()
  }
  // Escキーで選択解除
  if (e.key === 'Escape' && selectedElements.value.length) {
    clearSelection()
  }
  // コピー（Ctrl+C/Cmd+C）
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedElements.value.length) {
    const els = selectedElements.value.map(idx => slides.value[current.value].elements[idx])
    clipboard.value = JSON.parse(JSON.stringify(els))
    e.preventDefault()
  }
  // ペースト（Ctrl+V/Cmd+V）
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboard.value) {
    // 複製して少しずらして追加
    const pastedArr = Array.isArray(clipboard.value) ? clipboard.value : [clipboard.value]
    const newIdxs = []
    pastedArr.forEach(pasted => {
      const newEl = JSON.parse(JSON.stringify(pasted))
      newEl.x = (newEl.x || 0) + 30
      newEl.y = (newEl.y || 0) + 30
      slides.value[current.value].elements.push(newEl)
      newIdxs.push(slides.value[current.value].elements.length - 1)
    })
    selectedElements.value = newIdxs
    e.preventDefault()
  }
}
function clearSelection() {
  selectedElements.value = []
}
// スライド保存
function saveSlides() {
  const data = JSON.stringify(slides.value, null, 2)
  const blob = new Blob([data], {type: 'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'slides.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
// スライド読込
function openSlides(jsonStr) {
  try {
    const arr = JSON.parse(jsonStr)
    if (Array.isArray(arr) && arr.every(s => s.elements)) {
      slides.value = arr
      current.value = 0
      selectedElements.value = []
    } else {
      alert('不正なスライドデータです')
    }
  } catch {
    alert('ファイルの読み込みに失敗しました')
  }
}
// 新規作成
function newSlides() {
  if (!confirm('現在のスライドを消去して新規作成します。よろしいですか？')) return
  slides.value = [
    { elements: [] }
  ]
  current.value = 0
  selectedElements.value = []
}
// ローカル保存
function localSave() {
  try {
    localStorage.setItem('mySlides', JSON.stringify(slides.value))
    alert('ローカル保存しました')
  } catch {
    alert('ローカル保存に失敗しました')
  }
}
// ローカル読込
function localLoad() {
  const saved = localStorage.getItem('mySlides')
  if (saved) {
    try {
      const arr = JSON.parse(saved)
      if (Array.isArray(arr) && arr.every(s => s.elements)) {
        slides.value = arr
        current.value = 0
        selectedElements.value = []
      } else {
        alert('ローカルデータが不正です')
      }
    } catch {
      alert('ローカルデータの読込に失敗しました')
    }
  } else {
    alert('ローカルに保存されたデータがありません')
  }
}
// AddBarのドラッグ移動
const addBarX = ref(0)
const addBarY = ref(0)
const addBarDragging = ref(false)
let addBarDragOffset = {x:0, y:0}
function startAddBarDrag(e) {
  addBarDragging.value = true
  addBarDragOffset = {
    x: e.clientX - addBarX.value,
    y: e.clientY - addBarY.value
  }
  window.addEventListener('mousemove', onAddBarDrag)
  window.addEventListener('mouseup', stopAddBarDrag)
}
function onAddBarDrag(e) {
  if (!addBarDragging.value) return
  addBarX.value = e.clientX - addBarDragOffset.x
  addBarY.value = e.clientY - addBarDragOffset.y
}
function stopAddBarDrag() {
  addBarDragging.value = false
  window.removeEventListener('mousemove', onAddBarDrag)
  window.removeEventListener('mouseup', stopAddBarDrag)
}
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  // サイトを開いた時点でローカルデータ自動読込
  localLoad()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style>
@import '../assets/common.css';
</style>
