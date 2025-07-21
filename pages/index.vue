<template>
    <div v-if="isHome" class="home-bg">
      <div class="home-container">
        <h1>ようこそ！</h1>
        <button class="home-btn" @click="newSlidesWithTitle">＋ 新規作成</button>
        <button class="home-btn" @click="openFileImport">ファイルから読み込む</button>
        <input type="file" ref="fileImportInput" accept="application/json" style="display:none" @change="onFileImportChange" />
        <div class="slides-list">
          <div v-for="slide in slidesList" :key="slide.id" class="slide-list-item">
            <div class="slide-thumb">
              <template v-if="getSlideThumb(slide.id) && getSlideThumb(slide.id).type === 'image'">
                <img :src="getSlideThumb(slide.id).content" alt="thumb" />
              </template>
              <template v-else-if="getSlideThumb(slide.id) && getSlideThumb(slide.id).type === 'text'">
                <span class="slide-thumb-text">{{ getSlideThumb(slide.id).content.slice(0, 12) }}</span>
              </template>
              <template v-else>
                <span class="slide-thumb-placeholder">No Image</span>
              </template>
            </div>
            <div class="slide-title">{{ slide.title }}</div>
            <div class="slide-date">{{ slide.date }}</div>
            <button @click="openSlidesById(slide.id)">開く</button>
            <button @click="deleteSlidesById(slide.id)">削除</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="keynote-bg keynote-flex">
      <header class="app-bar">
        <div class="app-bar-actions">
          <button class="app-bar-btn" @click="goHome">🏠 ホームに戻る</button>
          <input class="slide-title-input" v-model="slidesTitle" @input="onTitleInput" placeholder="スライド名を入力" />
          <button class="app-bar-btn" @click="addElement('image')">＋URLから画像を追加</button>
          <button class="app-bar-btn" @click="addLocalImage">＋画像を挿入</button>
          <input type="file" ref="localImageInput" accept="image/*" style="display:none" @change="onLocalImageChange" />
          <button class="app-bar-btn" @click="addElement('text')">＋テキスト追加</button>
          <button class="app-bar-btn" @click="addElement('rect')">＋四角形追加</button>
          <button class="app-bar-btn" @click="saveCurrentSlides">書き出し</button>
          <button class="app-bar-btn" @click="newSlides">新規</button>
          <button class="app-bar-btn" @click="localSave">ローカル保存</button>
          <button class="app-bar-btn" @click="startSlideshow">▶スライドショー</button>
          <label class="autosave-toggle">
            <span>自動保存</span>
            <span class="ios-switch">
              <input type="checkbox" v-model="autoSave" />
              <span class="slider"></span>
            </span>
          </label>
        </div>
      </header>
      <SlideListMenu :slides="slides" :current="current" @goTo="goTo" @addSlide="addSlide" />
      <main class="keynote-main main-flex">
        <div class="main-center">
          <div style="text-align:center; position:relative; width:100%; display:flex; flex-direction:column; align-items:center;">
            <div
              ref="canvasWrapper"
              style="position:relative; width:100%; aspect-ratio:16/9; margin:0 auto; background:transparent;"
              @dragover.prevent="onCanvasDragOver"
              @drop.prevent="onCanvasDrop"
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
              <div class="canvas-zoom-wrapper">
                <div :style="zoom.value < 1 ? { transform: `scale(${zoom.value})`, transformOrigin: 'top left', width: baseWidth + 'px', height: baseHeight + 'px' } : { width: baseWidth + 'px', height: baseHeight + 'px' }">
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
                    :canvasWidth="baseWidth"
                    :canvasHeight="baseHeight"
                    :zoom="zoom.value"
                  />
                </div>
                <div class="canvas-zoom-ui">
                  <button @click="zoomOut" :disabled="Number(zoom.value) <= minZoom">−</button>
                  <span>{{ isNaN(zoom.value) ? 100 : Math.round(zoom.value * 100) }}%</span>
                  <button @click="zoomIn" :disabled="Number(zoom.value) >= maxZoom">＋</button>
                  <button @click="resetZoom" :disabled="zoom.value === 1">100%</button>
                </div>
              </div>
            </div>
            <div v-if="selectedElements.length" style="position: fixed; top: 32px; right: 32px; z-index: 4000;">
              <ElementEditPanel
                v-if="selectedElements.length"
                :currentEls="currentEls"
                @removeElement="removeElement"
                @moveElementZ="moveElementZ"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  </template>
  <script setup>
  import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
  import SlideListMenu from '../components/SlideListMenu.vue'
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
    autoLocalSave()
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
  const isSlideshow = ref(false)
  const slideshowScale = ref(1)

  function updateSlideshowScale() {
    const w = window.innerWidth
    const h = window.innerHeight
    slideshowScale.value = Math.min(w / baseWidth, h / baseHeight)
  }

  function startSlideshow() {
    isSlideshow.value = true
    document.body.style.overflow = 'hidden'
    updateSlideshowScale()
    window.addEventListener('resize', updateSlideshowScale)
  }
  function endSlideshow() {
    isSlideshow.value = false
    document.body.style.overflow = ''
    window.removeEventListener('resize', updateSlideshowScale)
  }
  function handleSlideshowKey(e) {
    if (!isSlideshow.value) return
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'Enter') {
      if (current.value < slides.value.length - 1) current.value++
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (current.value > 0) current.value--
    } else if (e.key === 'Escape') {
      endSlideshow()
    }
  }
  const isHome = ref(true)
  const slidesList = ref([])
  const slidesTitle = ref('')
  const slidesMeta = ref({})

  function loadSlidesList() {
    // localStorageからmySlides_で始まる全てのスライドを列挙
    const list = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('mySlides_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key))
          // タイトル・日付はデータ内に無ければ仮で
          let title = '無題スライド', date = ''
          if (Array.isArray(data) && data.length > 0 && data[0].meta) {
            title = data[0].meta.title || title
            date = data[0].meta.date || ''
          }
          list.push({
            id: key.replace('mySlides_', ''),
            title,
            date
          })
        } catch {}
      }
    }
    slidesList.value = list
  }
  function saveSlidesList() {
    localStorage.setItem('mySlidesList', JSON.stringify(slidesList.value))
  }
  function goHome() {
    isHome.value = true
    loadSlidesList()
  }
  function openSlidesById(id) {
    const data = localStorage.getItem('mySlides_' + id)
    if (data) {
      openSlides(data)
      const meta = slidesList.value.find(s => s.id === id)
      if (meta) setSlidesMeta(meta)
      isHome.value = false
    }
  }
  function deleteSlidesById(id) {
    if (!confirm('本当に削除しますか？')) return
    localStorage.removeItem('mySlides_' + id)
    loadSlidesList()
  }
  function newSlidesWithTitle() {
    slides.value = [{ elements: [] }]
    current.value = 0
    selectedElements.value = []
    slidesTitle.value = ''
    slidesMeta.value = {}
    isHome.value = false
  }
  function updateSlidesMeta(title, date) {
    if (!slides.value[0].meta) slides.value[0].meta = {};
    slides.value[0].meta.title = title;
    slides.value[0].meta.date = date;
  }
  function saveSlidesAsNew() {
    const id = Date.now().toString();
    const title = slidesTitle.value || '無題スライド';
    const date = new Date().toLocaleString();
    updateSlidesMeta(title, date);
    localStorage.setItem('mySlides_' + id, JSON.stringify(slides.value));
    loadSlidesList();
    setSlidesMeta({ id, title, date });
    alert('新しいスライドとして保存しました');
  }
  function saveCurrentSlides() {
    if (!slidesMeta.value.id) {
      saveSlidesAsNew();
    } else {
      const id = slidesMeta.value.id;
      const title = slidesMeta.value.title || '無題スライド';
      const date = new Date().toLocaleString();
      updateSlidesMeta(title, date);
      localStorage.setItem('mySlides_' + id, JSON.stringify(slides.value));
      loadSlidesList();
      setSlidesMeta({ id, title, date });
      alert('保存しました');
    }
  }
  function setSlidesMeta(meta) {
    slidesMeta.value = meta
    slidesTitle.value = meta.title
  }
  onMounted(() => {
    loadSlidesList();
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keydown', handleSlideshowKey)
    // サイトを開いた時点でローカルデータ自動読込
    localLoad()
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    if (canvasWrapper.value) {
      canvasWrapper.value.addEventListener('wheel', onWheel, { passive: false })
      canvasWrapper.value.addEventListener('touchstart', onTouchStart, { passive: false })
      canvasWrapper.value.addEventListener('touchmove', onTouchMove, { passive: false })
      canvasWrapper.value.addEventListener('touchend', onTouchEnd, { passive: false })
    }
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateCanvasSize)
    window.removeEventListener('resize', updateSlideshowScale)
    if (canvasWrapper.value) {
      canvasWrapper.value.removeEventListener('wheel', onWheel)
      canvasWrapper.value.removeEventListener('touchstart', onTouchStart)
      canvasWrapper.value.removeEventListener('touchmove', onTouchMove)
      canvasWrapper.value.removeEventListener('touchend', onTouchEnd)
    }
  })
  
  // --- ここからズーム機能 ---
  const minZoom = 0.2;
  const maxZoom = 2;
  const zoom = ref(1)
  function setZoom(val) {
    console.log(val);
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      zoom.value = 1;
    } else {
      zoom.value = Math.max(minZoom, Math.min(maxZoom, Math.round(val * 100) / 100));
    }
  }
  function zoomIn() { setZoom(zoom.value + 0.1) }
  function zoomOut() { setZoom(zoom.value - 0.1) }
  function resetZoom() { setZoom(1) }
  let lastTouchDist = null
  function getTouchDist(e) {
    if (e.touches.length < 2) return 0
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    return Math.sqrt(dx*dx + dy*dy)
  }
  function onWheel(e) {
    // 通常のCtrl+ホイール or Macのピンチズーム
    const isMac = navigator.platform.includes('Mac');
    const isPinch = e.ctrlKey || (isMac && Math.abs(e.deltaY) < 15 && e.deltaMode === 0);
    if (isPinch) {
      e.preventDefault();
      setZoom(zoom.value - e.deltaY * 0.01);
    }
  }
  function onTouchStart(e) {
    if (e.touches.length === 2) {
      lastTouchDist = getTouchDist(e)
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 2 && lastTouchDist) {
      const dist = getTouchDist(e)
      const scale = dist / lastTouchDist
      setZoom(zoom.value * scale)
      lastTouchDist = dist
      e.preventDefault()
    }
  }
  function onTouchEnd(e) {
    if (e.touches.length < 2) lastTouchDist = null
  }
  // --- ここまでズーム機能 ---
  
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
  const autoSave = ref(true)
  function toggleAutoSave() {
    autoSave.value = !autoSave.value
  }
  function autoLocalSave() {
    if (autoSave.value) localSave()
  }
  function removeElement() {
    pushHistory()
    if (selectedElements.value.length) {
      // 後ろから消す
      selectedElements.value.sort((a,b)=>b-a).forEach(idx => {
        slides.value[current.value].elements.splice(idx, 1)
      })
      selectedElements.value = []
      autoLocalSave()
    }
  }
  
  // 要素追加
  function addElement(type) {
    pushHistory()
    let el
    if (type === 'image') {
      el = { type: 'image', content: '', x: 100, y: 100, width: 200, height: 120, shadow: false, background: '' }
    } else if (type === 'text') {
      el = { type: 'text', content: 'テキスト', x: 150, y: 150, width: 200, height: 60, fontSize: 32, color: '#222222', shadow: false, background: '' }
    } else if (type === 'rect') {
      el = { type: 'rect', x: 120, y: 120, width: 200, height: 120, background: '#1976d2', shadow: false }
    }
    slides.value[current.value].elements.push(el)
    selectedElement.value = slides.value[current.value].elements.length - 1
    autoLocalSave()
  }
  
  // スライド切り替え
  function goTo(idx) {
    current.value = idx
    selectedElements.value = []
    autoLocalSave()
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
    autoLocalSave()
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
    autoLocalSave()
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
        autoLocalSave()
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
      x: (e.clientX - rect.left) / zoom.value,
      y: (e.clientY - rect.top) / zoom.value
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
  function onCanvasDragOver(e) {
    e.preventDefault()
  }
  function onCanvasDrop(e) {
    e.preventDefault()
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return
    const file = e.dataTransfer.files[0]
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      pushHistory()
      slides.value[current.value].elements.push({
        type: 'image',
        content: evt.target.result,
        x: 100, y: 100, width: 320, height: 180, shadow: false, background: ''
      })
      selectedElements.value = [slides.value[current.value].elements.length - 1]
      autoLocalSave()
    }
    reader.readAsDataURL(file)
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
    let justify = 'center';
    if (el.textAlign === 'left') justify = 'flex-start';
    if (el.textAlign === 'right') justify = 'flex-end';
    return {
      fontSize: (el.fontSize || 32) + 'px',
      color: el.color || '#222222',
      width: '100%',
      height: '100%',
      fontWeight: 600,
      textAlign: el.textAlign || 'center',
      wordBreak: 'break-word',
      display: 'flex',
      alignItems: 'center',
      justifyContent: justify,
      background: 'none',
      pointerEvents: 'none',
      whiteSpace: 'pre-line',
    }
  }
  
  // Deleteキーで要素削除
  function handleKeydown(e) {
    // テキスト編集中やinput/textareaにフォーカス時は無視
    const tag = document.activeElement?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea') return
    // スライド切り替え（上下矢印）
    if (e.key === 'ArrowUp') {
      if (current.value > 0) {
        current.value--
        selectedElements.value = []
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      if (current.value < slides.value.length - 1) {
        current.value++
        selectedElements.value = []
        e.preventDefault()
      }
      return
    }
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
    if ((e.key === 'Delete' || e.key === 'Backspace')) {
      if (selectedElements.value.length) {
        removeElement()
      } else if (slides.value.length > 1) {
        // スライドが1枚だけの場合は消さない
        pushHistory()
        slides.value.splice(current.value, 1)
        // 削除後のインデックス調整
        if (current.value >= slides.value.length) {
          current.value = slides.value.length - 1
        }
        autoLocalSave()
      }
    }
    // Escキーで選択解除
    if (e.key === 'Escape' && selectedElements.value.length) {
      clearSelection()
    }
    // コピー（Ctrl+C/Cmd+C）
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (selectedElements.value.length) {
        const els = selectedElements.value.map(idx => slides.value[current.value].elements[idx])
        clipboard.value = JSON.parse(JSON.stringify(els))
        e.preventDefault()
      } else {
        // スライド全体をコピー
        clipboard.value = { slide: JSON.parse(JSON.stringify(slides.value[current.value])) }
        e.preventDefault()
      }
    }
    // ペースト（Ctrl+V/Cmd+V）
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboard.value) {
      if (Array.isArray(clipboard.value)) {
        // 要素のペースト
        const pastedArr = clipboard.value
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
      } else if (clipboard.value.slide) {
        // スライドのペースト
        pushHistory()
        slides.value.splice(current.value + 1, 0, JSON.parse(JSON.stringify(clipboard.value.slide)))
        current.value = current.value + 1
        selectedElements.value = []
        e.preventDefault()
      }
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
        autoLocalSave()
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
    autoLocalSave()
  }
  // ローカル保存
  function localSave() {
    try {
      const id = slidesMeta.value.id || Date.now().toString();
      const title = slidesMeta.value.title || slidesTitle.value || '無題スライド';
      const date = new Date().toLocaleString();
      updateSlidesMeta(title, date);
      localStorage.setItem('mySlides_' + id, JSON.stringify(slides.value));
      loadSlidesList();
      setSlidesMeta({ id, title, date });
      // alert('ローカル保存しました')
    } catch {
      console.error('ローカル保存に失敗しました');
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
  
  const baseWidth = 1280;
  const baseHeight = 720;
  
  function addSlide() {
    pushHistory()
    slides.value.push({ elements: [] })
    current.value = slides.value.length - 1
    selectedElements.value = []
    autoLocalSave()
  }
  
  function moveElementZ(direction) {
    if (!selectedElements.value.length) return
    const idx = selectedElements.value[0]
    const els = slides.value[current.value].elements
    if (direction === 'up' && idx < els.length - 1) {
      // 前面へ
      [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]]
      selectedElements.value = [idx + 1]
      autoLocalSave()
    } else if (direction === 'down' && idx > 0) {
      // 背面へ
      [els[idx], els[idx - 1]] = [els[idx - 1], els[idx]]
      selectedElements.value = [idx - 1]
      autoLocalSave()
    }
  }
  const localImageInput = ref(null)
  function addLocalImage() {
    localImageInput.value && localImageInput.value.click()
  }
  function onLocalImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      pushHistory()
      slides.value[current.value].elements.push({
        type: 'image',
        content: evt.target.result,
        x: 100, y: 100, width: 320, height: 180, shadow: false, background: ''
      })
      selectedElements.value = [slides.value[current.value].elements.length - 1]
      autoLocalSave()
    }
    reader.readAsDataURL(file)
    e.target.value = '' // 同じファイルを連続で選択できるように
  }
  const fileImportInput = ref(null)
  function openFileImport() {
    fileImportInput.value && fileImportInput.value.click()
  }
  function onFileImportChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      openSlides(evt.target.result)
      isHome.value = false
    }
    reader.readAsText(file)
    e.target.value = ''
  }
  function getSlideThumb(id) {
    const data = localStorage.getItem('mySlides_' + id)
    if (!data) return {}
    try {
      const slidesArr = JSON.parse(data)
      if (Array.isArray(slidesArr) && slidesArr.length > 0) {
        const first = slidesArr[0].elements && slidesArr[0].elements[0]
        if (first) return first
      }
    } catch {}
    return {}
  }
  function onTitleInput() {
    slidesMeta.value.title = slidesTitle.value;
    if (slides.value[0] && slides.value[0].meta) {
      slides.value[0].meta.title = slidesTitle.value;
    }
  }
  </script>
  
  <style>
  @import '../assets/common.css';
  html, body {
    overflow: hidden;
    height: 100%;
    font-family: 'Inter', 'Helvetica Neue', Arial, 'Hiragino Sans', 'Meiryo', sans-serif;
  }
  .app-bar {
    width: 100%;
    min-width: 0;
    height: 56px;
    background: linear-gradient(90deg, #007aff 60%, #4fc3f7 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    box-shadow: 0 2px 8px #007aff22;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 5000;
    overflow-x: hidden;
  }
  .app-bar-title {
    font-size: 1.3em;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .app-bar-actions {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    max-width: 100vw;
    min-width: 0;
    width: 100%;
    flex-shrink: 1;
    align-items: center;
  }
  .app-bar-btn {
    background: #fff;
    color: #007aff;
    border: none;
    border-radius: 8px;
    padding: 7px 16px;
    font-size: 1em;
    font-weight: 600;
    box-shadow: 0 1px 4px #007aff11;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .app-bar-btn:hover {
    background: #e3f0ff;
    color: #0051a8;
  }
  .keynote-bg {
    padding-top: 56px;
  }
  .keynote-main .main-center {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }
  .canvas-zoom-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
    overflow: auto;
  }
  .slideshow-overlay {
    position: fixed;
    z-index: 99999;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #111e;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', 'Helvetica Neue', Arial, 'Hiragino Sans', 'Meiryo', sans-serif;
  }
  .slideshow-canvas-wrapper {
    position: relative;
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .slideshow-canvas-scaler {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    /* 1280x720固定サイズをscaleで拡大 */
    background: #fff;
    border-radius: 0;
    box-shadow: none;
    transition: transform 0.2s;
  }
  .slideshow-canvas-wrapper > .slide-canvas {
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    aspect-ratio: 16/9;
    background: #fff;
    border-radius: 0;
    box-shadow: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', 'Helvetica Neue', Arial, 'Hiragino Sans', 'Meiryo', sans-serif;
  }
  .slideshow-exit-btn {
    position: absolute;
    top: 18px;
    right: 24px;
    z-index: 10;
    background: #fff;
    color: #007aff;
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 1.1em;
    font-weight: 600;
    box-shadow: 0 1px 4px #007aff22;
    cursor: pointer;
  }
  .slideshow-prev-btn, .slideshow-next-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    background: #fff;
    color: #007aff;
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    font-size: 2em;
    font-weight: 700;
    box-shadow: 0 1px 4px #007aff22;
    cursor: pointer;
    opacity: 0.8;
  }
  .slideshow-prev-btn { left: -64px; }
  .slideshow-next-btn { right: -64px; }
  .slideshow-page {
    position: absolute;
    bottom: 18px;
    right: 32px;
    background: #fff9;
    color: #007aff;
    border-radius: 8px;
    padding: 4px 16px;
    font-size: 1.1em;
    font-weight: 600;
    box-shadow: 0 1px 4px #007aff22;
  }
  .autosave-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1em;
    font-weight: 600;
    color: #fff;
    margin-left: 16px;
    user-select: none;
    height: 100%;
  }
  .autosave-toggle input[type="checkbox"] {
    accent-color: #007aff;
    width: 18px;
    height: 18px;
  }
  .ios-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 26px;
  }
  .ios-switch input[type="checkbox"] {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .ios-switch .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #ccc;
    border-radius: 26px;
    transition: background 0.2s;
  }
  .ios-switch .slider:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 2px;
    bottom: 2px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s;
    box-shadow: 0 1px 4px #0002;
  }
  .ios-switch input:checked + .slider {
    background: #4fc3f7;
  }
  .ios-switch input:checked + .slider:before {
    transform: translateX(18px);
  }
  .home-bg {
    min-height: 100vh;
    background: linear-gradient(135deg, #e9e9f3 0%, #f7fafd 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .home-container {
    background: #fff;
    border-radius: 24px;
    box-shadow: 0 4px 24px #007aff22;
    padding: 48px 32px 32px 32px;
    min-width: 340px;
    max-width: 60vw;
    width: 100%; 
  }
  .home-btn {
    background: #007aff;
    color: #fff;
    border: none;
    margin-right: 10px;
    border-radius: 12px;
    padding: 12px 32px;
    font-size: 1.2em;
    font-weight: 700;
    margin-bottom: 24px;
    cursor: pointer;
    box-shadow: 0 2px 8px #007aff22;
    transition: background 0.2s;
  }
  .home-btn:hover {
    background: #0051a8;
  }
  .slides-list {
    margin-top: 16px;
  }
  .slide-list-item {
    background: #f4f6fa;
    border-radius: 10px;
    padding: 16px 18px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 1px 4px #007aff11;
  }
  .slide-title {
    font-size: 1.1em;
    font-weight: 600;
    color: #007aff;
    flex: 1 1 0%;
  }
  .slide-date {
    font-size: 0.95em;
    color: #888;
    margin-right: 12px;
  }
  .slide-list-item button {
    background: #fff;
    color: #007aff;
    border: 1.5px solid #007aff44;
    border-radius: 6px;
    padding: 6px 16px;
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .slide-list-item button:hover {
    background: #e3f0ff;
    color: #0051a8;
  }
  .slide-thumb {
    width: 56px;
    height: 36px;
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 1px 4px #0001;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-right: 12px;
  }
  .slide-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .slide-thumb-text {
    font-size: 0.8em;
    color: #333;
    text-align: center;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .slide-thumb-placeholder {
    font-size: 0.7em;
    color: #bbb;
    text-align: center;
  }
  .slide-title-input {
    font-size: 1.1em;
    font-weight: 600;
    border: 1.5px solid #e0e0e0;
    border-radius: 8px;
    padding: 6px 16px;
    margin-right: 12px;
    min-width: 180px;
    max-width: 320px;
    background: #f7fafd;
    color: #222;
    outline: none;
    box-shadow: 0 1px 4px #007aff11;
    transition: border 0.2s, box-shadow 0.2s;
  }
  .slide-title-input:focus {
    border: 1.5px solid #007aff;
    box-shadow: 0 2px 8px #007aff22;
  }
  </style>
  
  