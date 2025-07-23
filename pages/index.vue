<template>
    <div v-if="isHome" class="home-bg">
      <div class="home-container">
        <h1>ようこそ！</h1>
        <button class="home-btn" @click="newSlidesWithTitle">＋ 新規作成</button>
        <button class="home-btn" @click="openFileImport">ファイルから読み込む</button>
        <input type="file" ref="fileImportInput" accept="application/json" style="display:none" @change="onFileImportChange" />
        <div class="slides-list">
          <div v-for="(slide, idx) in slidesList" :key="slide.id" class="slide-list-item"
            @dragover.prevent="onSlideDragOver($event, idx)"
            @drop.prevent="onSlideDrop($event, idx)"
            @dragenter.prevent="onSlideDragEnter($event, idx)"
            @dragleave="onSlideDragLeave($event, idx)"
            :class="{ 
              dragging: draggingSlideIdx === idx,
              'drag-over': dragOverIdx === idx
            }"
          >
            <!-- ドラッグハンドルエリア -->
            <div class="drag-handle"
              draggable="true"
              @dragstart="onSlideDragStart(idx, $event)"
              @dragend="onSlideDragEnd"
              title="ドラッグして順序を変更"
            >
              <div class="drag-icon">⋮⋮</div>
            </div>
            
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
            <div class="slide-actions">
              <button @click.stop="openSlidesById(slide.id)">開く</button>
              <button @click.stop="deleteSlidesById(slide.id)">削除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="keynote-bg keynote-flex">
      <header class="app-bar">
        <div class="app-bar-actions">
          <button class="app-bar-btn" @click="goHome">🏠 ホームに戻る</button>
          <input class="slide-title-input" v-model="slidesTitle" @input="onTitleInput" placeholder="スライド名を入力" />
          <button class="app-bar-btn" @click="saveSlides">書き出し</button>
          <button class="app-bar-btn" @click="newSlides">新規</button>
        </div>
      </header>
      <SlideListMenu :slides="slides" :current="current" @goTo="goTo" @addSlide="addSlide" @moveSlide="moveSlide" />
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
                <div
                  class="main-slide-container"
                  :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom.value})`, transformOrigin: '0 0' }"
                >
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
                    :background="slides[current].background || '#ffffff'"
                  />
                </div>
              </div>
            </div>
            <div v-if="selectedElements.length || true" style="position: fixed; top: 32px; right: 32px; z-index: 4000;">
              <ElementEditPanel
                :currentEls="currentEls"
                @removeElement="removeElement"
                @moveElementZ="moveElementZ"
                :slideBackground="slides[current].background || '#ffffff'"
                @update:slideBackground="val => { slides[current].background = val; autoLocalSave(); }"
              />
            </div>
          </div>
        </div>
      </main>
      <!-- Slideshow Overlay -->
      <div v-if="isSlideshow" class="slideshow-overlay">
        <div class="slideshow-canvas-wrapper">
          <div class="slideshow-canvas-scaler" :style="{ width: baseWidth + 'px', height: baseHeight + 'px', transform: `scale(${slideshowScale})`, transformOrigin: 'center center' }">
            <SlideCanvas
              :elements="slides[current].elements"
              :selectedElements="[]"
              :canvasWidth="baseWidth"
              :canvasHeight="baseHeight"
              :zoom="1"
              :elementStyle="elementStyle"
              :textElementStyle="textElementStyle"
              :isEditingText="alwaysFalse"
              :background="slides[current].background || '#ffffff'"
              :disabled="true"
              :selectElement="() => {}"
              :startDrag="() => {}"
              :startResize="() => {}"
              :onCanvasMouseDown="() => {}"
              :clearSelection="() => {}"
              :startInlineEdit="() => {}"
              :finishInlineEdit="() => {}"
            />
          </div>
          <button class="slideshow-exit-btn" @click="endSlideshow">終了</button>
          <button class="slideshow-prev-btn" @click="goToPrevSlide" :disabled="current === 0">‹</button>
          <button class="slideshow-next-btn" @click="goToNextSlide" :disabled="current === slides.length - 1">›</button>
          <div class="slideshow-page">{{ current + 1 }} / {{ slides.length }}</div>
        </div>
      </div>
      <!-- Bottom Bar -->
      <footer class="bottom-bar">
        <button class="bottom-bar-btn" @click="addElement('image')">＋URLから画像を追加</button>
        <button class="bottom-bar-btn" @click="addLocalImage">＋画像を挿入</button>
        <input type="file" ref="localImageInput" accept="image/*" style="display:none" @change="onLocalImageChange" />
        <button class="bottom-bar-btn" @click="addElement('text')">＋テキスト追加</button>
        <button class="bottom-bar-btn" @click="addElement('rect')">＋四角形追加</button>
        <div class="canvas-zoom-ui">
          <button @click="zoomOut" :disabled="Number(zoom.value) <= minZoom">−</button>
          <span>{{ isNaN(zoom.value) ? 100 : Math.round(zoom.value * 100) }}%</span>
          <button @click="zoomIn" :disabled="Number(zoom.value) >= maxZoom">＋</button>
          <button @click="resetZoom" :disabled="zoom.value === 1">100%</button>
        </div>
        <button class="bottom-bar-btn" @click="startSlideshow">▶スライドショー</button>
        <button class="bottom-bar-btn" @click="manualLocalSave">ローカル保存</button>
        <label class="autosave-toggle bottom-autosave">
          <span>自動保存</span>
          <span class="ios-switch">
            <input type="checkbox" v-model="autoSave" />
            <span class="slider"></span>
          </span>
        </label>
      </footer>
    </div>
  </template>
  <script setup>
  import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
  import SlideListMenu from '../components/SlideListMenu.vue'
  import SlideCanvas from '../components/SlideCanvas.vue'
  import ElementEditPanel from '../components/ElementEditPanel.vue'
  import * as idb from '../utils/idb.js'
  import { toRaw } from 'vue'
  
  // スライドショー用のダミー関数
  const alwaysFalse = () => false;
  // スライドショー用のウィンドウサイズreactive
  const windowWidth = ref(0)
  const windowHeight = ref(0)
  function updateWindowSize() {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }
  onMounted(() => {
    updateWindowSize()
    window.addEventListener('resize', updateWindowSize)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateWindowSize)
  })
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
  const pan = ref({ x: 0, y: 0 })
  
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
  // 新しいslideshowScale定義
  const slideshowScale = computed(() => {
    // マージンを考慮してスケールを計算（各方向に40pxのマージンを確保）
    const margin = 80; // 上下左右40pxずつ
    const availableWidth = Math.max(windowWidth.value - margin, 100);
    const availableHeight = Math.max(windowHeight.value - margin, 100);
    const scale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight);
    // 最小スケールを0.1に設定して、必ず表示されるようにする
    return Math.max(scale, 0.1);
  })
  watch(slideshowScale, (val) => {
    console.log('slideshowScale changed:', val);
    console.log('Window size:', windowWidth.value, 'x', windowHeight.value);
    console.log('Base size:', baseWidth, 'x', baseHeight);
  });
  function startSlideshow() {
    updateWindowSize(); // 画面サイズを再計算
    console.log('Starting slideshow...');
    console.log('Window size before:', windowWidth.value, 'x', windowHeight.value);
    
    // 少し遅延を入れてウィンドウサイズが確実に更新されるようにする
    nextTick(() => {
      updateWindowSize();
      console.log('Window size after update:', windowWidth.value, 'x', windowHeight.value);
      console.log('Base size:', baseWidth, 'x', baseHeight);
      console.log('Calculated scale:', slideshowScale.value);
      
      isSlideshow.value = true;
      document.body.style.overflow = 'hidden';
    });
  }
  function endSlideshow() {
    isSlideshow.value = false;
    document.body.style.overflow = '';
    isHome.value = false; // 編集画面に戻す
    // スライドショー終了後にレイアウトを再計算
    nextTick(() => {
      updateWindowSize();
      updateCanvasSize();
    });
  }
  
  function goToPrevSlide() {
    if (current.value > 0) {
      current.value--;
    }
  }
  
  function goToNextSlide() {
    if (current.value < slides.value.length - 1) {
      current.value++;
    }
  }
  function handleSlideshowKey(e) {
    if (!isSlideshow.value) return
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'Enter') {
      goToNextSlide()
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      goToPrevSlide()
    } else if (e.key === 'Escape') {
      endSlideshow()
    }
  }
  const isHome = ref(true)
  const slidesList = ref([])
  const slidesTitle = ref('')
  const slidesMeta = ref({})

  async function loadSlidesList() {
    const allSlides = await idb.getAll();
    const list = allSlides.map(item => {
      const data = item.value;
      let title = '無題スライド', date = '';
      if (Array.isArray(data) && data.length > 0 && data[0].meta) {
        title = data[0].meta.title || title;
        date = data[0].meta.date || '';
      }
      return { id: item.id, title, date };
    });
    slidesList.value = list;
  }

  function saveSlidesList() {
    // This function becomes obsolete as we load the list from the DB directly.
    // We can keep it empty or remove its usages.
  }
  async function goHome() {
    isHome.value = true
    await loadSlidesList()
  }
  async function openSlidesById(id) {
    const data = await idb.get(id);
    if (data) {
      // メタデータを先に設定
      const meta = slidesList.value.find(s => s.id === id);
      if (meta) setSlidesMeta(meta);
      
      // スライドデータを読み込み（自動保存は後で）
      try {
        if (Array.isArray(data) && data.every(s => s.elements)) {
          slides.value = data
          current.value = 0
          selectedElements.value = []
        } else {
          alert('不正なスライドデータです')
        }
      } catch {
        alert('ファイルの読み込みに失敗しました')
      }
      
      isHome.value = false;
    }
  }
  async function deleteSlidesById(id) {
    if (!confirm('本当に削除しますか？')) return
    await idb.remove(id);
    await loadSlidesList();
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
  async function saveSlidesAsNew() {
    const id = Date.now().toString();
    const title = slidesTitle.value || '無題スライド';
    const date = new Date().toLocaleString();
    updateSlidesMeta(title, date);
    await idb.set(id, toRaw(slides.value));
    await loadSlidesList();
    setSlidesMeta({ id, title, date });
    alert('新しいスライドとして保存しました');
  }
  async function saveSlidesAsNewSilent() {
    const id = Date.now().toString();
    const title = slidesTitle.value || '無題スライド';
    const date = new Date().toLocaleString();
    updateSlidesMeta(title, date);
    await idb.set(id, toRaw(slides.value));
    await loadSlidesList();
    setSlidesMeta({ id, title, date });
    // アラートなしの静音バージョン
  }
  async function saveCurrentSlides() {
    if (!slidesMeta.value.id) {
      await saveSlidesAsNew();
    } else {
      const id = slidesMeta.value.id;
      const title = slidesMeta.value.title || '無題スライド';
      const date = new Date().toLocaleString();
      updateSlidesMeta(title, date);
      await idb.set(id, toRaw(slides.value));
      await loadSlidesList();
      setSlidesMeta({ id, title, date });
      alert('保存しました');
    }
  }
  function setSlidesMeta(meta) {
    // 既存IDがあればそれを優先
    slidesMeta.value.id = slidesMeta.value.id || meta.id;
    slidesMeta.value.title = meta.title;
    slidesTitle.value = meta.title;
    if (meta.date) slidesMeta.value.date = meta.date;
  }
  onMounted(async () => {
    await loadSlidesList();
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keydown', handleSlideshowKey)
    // サイトを開いた時点でローカルデータ自動読込
    // localLoad() // localLoad is now obsolete with IndexedDB, starting with a blank slate or the last opened slide might be better.
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
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('keydown', handleSlideshowKey)
    if (canvasWrapper.value) {
      canvasWrapper.value.removeEventListener('wheel', onWheel)
      canvasWrapper.value.removeEventListener('touchstart', onTouchStart)
      canvasWrapper.value.removeEventListener('touchmove', onTouchMove)
      canvasWrapper.value.removeEventListener('touchend', onTouchEnd)
    }
  })
  watch(isSlideshow, (val) => {
    if (val) {
      updateWindowSize();
    }
  });
  
  // --- ここからズーム機能 ---
  const minZoom = 0.2;
  const maxZoom = 2;
  const zoom = ref(1)
  function setZoom(val, center) {
    const newZoom = Math.max(minZoom, Math.min(maxZoom, val));
    const oldZoom = zoom.value;
    if (center) {
      // centerはビューポート基準の座標（canvasWrapperの左上からの相対位置）
      pan.value.x = center.x - ((center.x - pan.value.x) * newZoom) / oldZoom;
      pan.value.y = center.y - ((center.y - pan.value.y) * newZoom) / oldZoom;
    } else {
      // ズームの中心が指定されていない場合は、現在のビューの中心を基準にする
      const rect = canvasWrapper.value.getBoundingClientRect();
      const viewCenter = { x: rect.width / 2, y: rect.height / 2 };
      pan.value.x = viewCenter.x - ((viewCenter.x - pan.value.x) * newZoom) / oldZoom;
      pan.value.y = viewCenter.y - ((viewCenter.y - pan.value.y) * newZoom) / oldZoom;
    }
    zoom.value = newZoom;
  }
  function zoomIn() {
    setZoom(zoom.value + 0.1);
  }
  function zoomOut() {
    setZoom(zoom.value - 0.1);
  }
  function resetZoom() {
    pan.value = { x: 0, y: 0 };
    setZoom(1);
  }
  let lastTouchDist = null
  let lastTouchCenter = null
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
      const rect = canvasWrapper.value.getBoundingClientRect();
      const center = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const newZoom = zoom.value - e.deltaY * 0.01;
      setZoom(newZoom, center);
    } else {
      e.preventDefault();
      pan.value.x -= e.deltaX;
      pan.value.y -= e.deltaY;
    }
  }
  function onTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault()
      lastTouchDist = getTouchDist(e)
      lastTouchCenter = getTouchCenter(e)
    } else if (e.touches.length === 1) {
      e.preventDefault();
      lastTouchCenter = getTouchCenter(e);
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 2 && lastTouchDist) {
      e.preventDefault()
      const dist = getTouchDist(e)
      const scale = dist / lastTouchDist
      const rect = canvasWrapper.value.getBoundingClientRect();
      const center = getTouchCenter(e);
      const relativeCenter = { x: center.clientX - rect.left, y: center.clientY - rect.top };
      setZoom(zoom.value * scale, relativeCenter)
      lastTouchDist = dist
      lastTouchCenter = center; // 2本指でもcenterを更新
    } else if (e.touches.length === 1 && lastTouchCenter) {
      // 1本指パン
      e.preventDefault()
      const center = getTouchCenter(e);
      pan.value.x += center.clientX - lastTouchCenter.clientX;
      pan.value.y += center.clientY - lastTouchCenter.clientY;
      lastTouchCenter = center;
    }
  }
  function onTouchEnd(e) {
    if (e.touches.length < 2) lastTouchDist = null
    if (e.touches.length < 1) lastTouchCenter = null
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
  // 自動保存の状態変更を監視
  watch(autoSave, (newVal) => {
    console.log('自動保存が', newVal ? '有効' : '無効', 'になりました');
  })
  function toggleAutoSave() {
    autoSave.value = !autoSave.value
  }
  function autoLocalSave() {
    if (autoSave.value) {
      console.log('自動保存を実行中...');
      localSave();
    } else {
      console.log('自動保存は無効です');
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
    selectedElements.value = [slides.value[current.value].elements.length - 1]
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
    const dx = (e.clientX - dragInfo.startX) / zoom.value
    const dy = (e.clientY - dragInfo.startY) / zoom.value
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
    const dx = (e.clientX - resizeInfo.startX) / zoom.value
    const dy = (e.clientY - resizeInfo.startY) / zoom.value
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
    const wrapperRect = canvasWrapper.value.getBoundingClientRect();
    const slideRect = canvasWrapper.value.querySelector('.main-slide-container').getBoundingClientRect();
    const x = (e.clientX - slideRect.left) / zoom.value;
    const y = (e.clientY - slideRect.top) / zoom.value;
    return { x, y };
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
  // スライド保存（JSON書き出し）
  function saveSlides() {
    const data = JSON.stringify(toRaw(slides.value), null, 2)
    const blob = new Blob([data], {type: 'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (slidesMeta.value.title || 'slides') + '.json'
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
        // autoLocalSave() を削除 - メタデータ設定後に適切に保存される
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
    // メタデータをクリアして新規プロジェクトとして扱う
    slidesMeta.value = {}
    slidesTitle.value = ''
    autoLocalSave()
  }
  // ローカル保存
  async function localSave() {
    try {
      if (!slidesMeta.value.id) {
        // 新規作成時のみID発行（自動保存時は静音）
        await saveSlidesAsNewSilent();
        return;
      }
      const id = slidesMeta.value.id;
      const title = slidesMeta.value.title || slidesTitle.value || '無題スライド';
      const date = new Date().toLocaleString();
      updateSlidesMeta(title, date);
      await idb.set(id, toRaw(slides.value));

      // slidesListの更新も行う
      const existing = slidesList.value.find(s => s.id === id);
      if (existing) {
        existing.title = title;
        existing.date = date;
      } else {
        slidesList.value.push({ id, title, date });
      }

      setSlidesMeta({ id, title, date });
      // alert('ローカル保存しました')
    } catch(e) {
      console.error('ローカル保存に失敗しました',e);
    }
  }
  // 手動ローカル保存（アラート付き）
  async function manualLocalSave() {
    try {
      if (!slidesMeta.value.id) {
        // 新規作成時はアラート付きで保存
        await saveSlidesAsNew();
        return;
      }
      await localSave();
      alert('ローカル保存しました');
    } catch(e) {
      console.error('ローカル保存に失敗しました',e);
      alert('ローカル保存に失敗しました');
    }
  }
  // ローカル読込 (This function might be deprecated or changed)
  async function localLoad() {
    // For now, this function is not directly used as we load the list on mount.
    // If you need to load a specific "last-opened" slide, this logic would change.
    // const saved = await idb.get('mySlides'); // Example of getting a specific item
    // if (saved) {
    //   try {
    //     const arr = saved; // No need to parse, it's already an object
    //     if (Array.isArray(arr) && arr.every(s => s.elements)) {
    //       slides.value = arr
    //       current.value = 0
    //       selectedElements.value = []
    //     } else {
    //       alert('ローカルデータが不正です')
    //     }
    //   } catch {
    //     alert('ローカルデータの読込に失敗しました')
    //   }
    // }
  }
  
  const baseWidth = 1280;
  const baseHeight = 720;

  // スライドショー用のscaleを計算
  
  function addSlide() {
    pushHistory()
    slides.value.push({ elements: [] })
    current.value = slides.value.length - 1
    selectedElements.value = []
    autoLocalSave()
  }
  
  function moveSlide(dragIdx, insertIdx) {
    console.log('スライド移動処理:', dragIdx, '→', insertIdx);
    pushHistory()
    
    // スライドの順序を変更
    const moved = slides.value.splice(dragIdx, 1)[0];
    
    // 挿入位置を調整（ドラッグした要素が取り除かれたため）
    let finalInsertIdx = insertIdx;
    if (dragIdx < insertIdx) {
      finalInsertIdx = insertIdx - 1;
    }
    
    slides.value.splice(finalInsertIdx, 0, moved);
    
    console.log('実際の挿入位置:', finalInsertIdx);
    
    // 現在のスライドインデックスを調整
    if (current.value === dragIdx) {
      // ドラッグしたスライドが現在選択中の場合
      current.value = finalInsertIdx;
    } else if (dragIdx < current.value && finalInsertIdx >= current.value) {
      // ドラッグしたスライドが現在のスライドより前にあり、後ろに移動した場合
      current.value = current.value - 1;
    } else if (dragIdx > current.value && finalInsertIdx <= current.value) {
      // ドラッグしたスライドが現在のスライドより後にあり、前に移動した場合
      current.value = current.value + 1;
    }
    
    selectedElements.value = []
    autoLocalSave()
    
    console.log('移動完了。新しい current:', current.value);
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
      // ファイルから読み込む時は新規プロジェクトとして扱う
      slidesMeta.value = {}
      slidesTitle.value = ''
      openSlides(evt.target.result)
      isHome.value = false
    }
    reader.readAsText(file)
    e.target.value = ''
  }
  async function getSlideThumb(id) {
    const data = await idb.get(id);
    if (!data) return {}
    try {
      const slidesArr = data;
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
  // --- スライド一覧ドラッグ＆ドロップ ---
  const draggingSlideIdx = ref(null)
  const dragOverIdx = ref(null)
  
  function onSlideDragStart(idx, event) {
    console.log('ドラッグ開始:', idx); // デバッグ用
    draggingSlideIdx.value = idx
    // 一部ブラウザで必須
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', idx.toString());
    
    // ドラッグ中のゴーストイメージを設定
    const dragElement = event.currentTarget.closest('.slide-list-item');
    if (dragElement) {
      event.dataTransfer.setDragImage(dragElement, 0, 0);
    }
  }
  
  function onSlideDragEnd() {
    draggingSlideIdx.value = null;
    dragOverIdx.value = null;
  }
  
  function onSlideDragOver(event, idx) {
    event.preventDefault();
    if (draggingSlideIdx.value !== null && draggingSlideIdx.value !== idx) {
      dragOverIdx.value = idx;
    }
  }
  
  function onSlideDragEnter(event, idx) {
    event.preventDefault();
    if (draggingSlideIdx.value !== null && draggingSlideIdx.value !== idx) {
      dragOverIdx.value = idx;
    }
  }
  
  function onSlideDragLeave(event, idx) {
    // 要素から完全に出た場合のみクリア
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (dragOverIdx.value === idx) {
        dragOverIdx.value = null;
      }
    }
  }
  
  function onSlideDrop(event, dropIdx) {
    console.log('ドロップ:', draggingSlideIdx.value, '→', dropIdx); // デバッグ用
    event.preventDefault();
    if (draggingSlideIdx.value === null || draggingSlideIdx.value === dropIdx) {
      dragOverIdx.value = null;
      return;
    }
    
    const dragIdx = draggingSlideIdx.value;
    const moved = slidesList.value.splice(dragIdx, 1)[0];
    
    // ドラッグした要素が後ろから前に移動する場合はインデックスを調整
    const newIdx = dragIdx < dropIdx ? dropIdx - 1 : dropIdx;
    slidesList.value.splice(newIdx, 0, moved);
    
    draggingSlideIdx.value = null;
    dragOverIdx.value = null;
    
    // 並び順を保存（将来的にIndexedDBやlocalStorageで永続化可能）
    console.log('スライド順序が変更されました:', slidesList.value.map(s => ({ id: s.id, title: s.title })));
  }
  // ---
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
    padding-bottom: 72px; /* ボトムバー分の余白を追加 */
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
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .main-slide-container {
    width: 1280px;
    height: 720px;
    position: relative;
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
    width: 1280px;
    height: 720px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .slideshow-canvas-wrapper > .slide-canvas {
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
    transition: all 0.2s ease;
    user-select: none;
    position: relative;
  }
  .slide-list-item.dragging {
    opacity: 0.5;
    transform: scale(0.98);
    box-shadow: 0 4px 12px #007aff33;
  }
  .slide-list-item.drag-over {
    background: #e3f0ff;
    border: 2px dashed #007aff;
    transform: scale(1.02);
    box-shadow: 0 4px 16px #007aff44;
  }
  .slide-list-item:hover:not(.dragging) {
    background: #eef2ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px #007aff22;
  }
  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 32px;
    cursor: grab;
    opacity: 0.6;
    transition: opacity 0.2s;
    flex-shrink: 0;
  }
  .drag-handle:active {
    cursor: grabbing;
  }
  .drag-handle:hover {
    opacity: 1;
  }
  .drag-icon {
    font-size: 14px;
    font-weight: bold;
    color: #666;
    line-height: 1;
    letter-spacing: -2px;
  }
  .slide-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
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
    flex-shrink: 0;
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
  /* Bottom Bar Styles */
  .bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 56px;
    background: linear-gradient(90deg, #007aff 60%, #4fc3f7 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    z-index: 5000;
    box-shadow: 0 -2px 8px #007aff22;
    padding: 0 24px;
  }
  .bottom-bar-btn {
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
  .bottom-bar-btn:hover {
    background: #e3f0ff;
    color: #0051a8;
  }
  .bottom-bar .canvas-zoom-ui {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    box-shadow: none;
    margin: 0 12px;
  }
  .bottom-bar .canvas-zoom-ui button {
    background: #fff;
    color: #007aff;
    border: none;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .bottom-bar .canvas-zoom-ui button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .bottom-bar .canvas-zoom-ui span {
    color: #fff;
    font-weight: 600;
    min-width: 40px;
    text-align: center;
  }
  .bottom-autosave {
    color: #fff;
    margin-left: 16px;
    font-size: 1em;
    font-weight: 600;
    user-select: none;
    height: 100%;
  }
  
  /* Slideshow Styles */
  .slideshow-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .slideshow-canvas-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .slideshow-canvas-scaler {
    position: relative;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  .slideshow-exit-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
    z-index: 10001;
  }
  
  .slideshow-exit-btn:hover {
    background: #fff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .slideshow-prev-btn, .slideshow-next-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    border: none;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .slideshow-prev-btn {
    left: 20px;
  }
  
  .slideshow-next-btn {
    right: 20px;
  }
  
  .slideshow-prev-btn:hover, .slideshow-next-btn:hover {
    background: #fff;
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .slideshow-prev-btn:disabled, .slideshow-next-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: translateY(-50%) scale(1);
  }
  
  .slideshow-page {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 1em;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 10001;
  }
  </style>
  
  