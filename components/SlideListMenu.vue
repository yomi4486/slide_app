<template>
  <aside class="slide-list-menu">
    <div class="slide-list-title">スライド一覧</div>
    <div class="slide-list-container">
      <ul>
        <template v-for="(slide, idx) in slides" :key="idx">
          <!-- ドロップライン（スライドの前） -->
          <li v-if="dropLinePosition === idx" class="drop-line" aria-hidden="true">
            <div class="drop-indicator"></div>
          </li>
          
          <!-- スライドアイテム -->
          <li :class="{ 
                active: idx === current,
                dragging: draggingSlideIdx === idx
              }" 
              draggable="true"
              @dragstart="onSlideDragStart(idx, $event)"
              @dragend="onSlideDragEnd"
              @dragover.prevent="onSlideDragOver($event, idx)"
              @dragenter.prevent="onSlideDragEnter($event, idx)"
              @drop.prevent="onSlideDrop($event, idx)"
              @click="$emit('goTo', idx)"
          >
            <div class="slide-thumb">
              <img v-if="slide.elements.find(e => e.type === 'image')" :src="slide.elements.find(e => e.type === 'image')?.content" alt="thumb" />
              <div v-else class="slide-thumb-placeholder">No Image</div>
            </div>
            <div class="slide-thumb-text">
              {{ slide.elements.find(e => e.type === 'text')?.content?.slice(0, 16) || '（テキストなし）' }}
            </div>
          </li>
        </template>
        
        <!-- ドロップライン（最後の位置） -->
        <li v-if="dropLinePosition === slides.length" class="drop-line" aria-hidden="true">
          <div class="drop-indicator"></div>
        </li>
        
        <li class="slide-list-divider" aria-hidden="true"></li>
        <li class="add-slide-btn" @click="$emit('addSlide')">
          <div class="slide-thumb slide-thumb-placeholder">＋</div>
          <div class="slide-thumb-text">スライド追加</div>
        </li>
      </ul>
    </div>
  </aside>
</template>
<script setup>
import { ref } from 'vue'

defineProps(['slides', 'current'])
const emit = defineEmits(['goTo', 'addSlide', 'moveSlide'])

// ドラッグ&ドロップ状態管理
const draggingSlideIdx = ref(null)
const dropLinePosition = ref(null) // ドロップラインの位置

function onSlideDragStart(idx, event) {
  console.log('スライドドラッグ開始:', idx);
  draggingSlideIdx.value = idx
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', idx.toString());
}

function onSlideDragEnd() {
  console.log('ドラッグ終了');
  draggingSlideIdx.value = null;
  dropLinePosition.value = null;
}

function onSlideDragOver(event, idx) {
  event.preventDefault();
  if (draggingSlideIdx.value === null) {
    return;
  }
  
  // マウスカーソルの位置からドロップ位置を判定
  const rect = event.currentTarget.getBoundingClientRect();
  const mouseY = event.clientY;
  const elementCenterY = rect.top + rect.height / 2;
  
  let insertPosition;
  if (mouseY < elementCenterY) {
    // 上半分の場合、この要素の前に挿入
    insertPosition = idx;
  } else {
    // 下半分の場合、この要素の後に挿入
    insertPosition = idx + 1;
  }
  
  dropLinePosition.value = insertPosition;
  console.log('ドロップライン位置:', insertPosition);
}

function onSlideDragEnter(event, idx) {
  event.preventDefault();
  // onSlideDragOverで詳細な位置判定を行うため、ここでは最小限の処理
}

function onSlideDrop(event, dropIdx) {
  event.preventDefault();
  console.log('ドロップイベント発生:', {
    draggingSlideIdx: draggingSlideIdx.value,
    dropIdx,
    dropLinePosition: dropLinePosition.value
  });
  
  if (draggingSlideIdx.value === null) {
    console.log('ドラッグ中のスライドがない');
    return;
  }
  
  const dragIdx = draggingSlideIdx.value;
  let insertIdx = dropLinePosition.value;
  
  // insertIdxがnullの場合は、dropIdxを使用
  if (insertIdx === null) {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseY = event.clientY;
    const elementCenterY = rect.top + rect.height / 2;
    insertIdx = mouseY < elementCenterY ? dropIdx : dropIdx + 1;
  }
  
  // 同じ位置にドロップした場合は何もしない
  if (dragIdx === insertIdx || (dragIdx + 1 === insertIdx && insertIdx > dragIdx)) {
    console.log('同じ位置へのドロップ、処理をスキップ');
    draggingSlideIdx.value = null;
    dropLinePosition.value = null;
    return;
  }
  
  console.log('スライド移動実行:', dragIdx, '→', insertIdx);
  
  // 親コンポーネントにスライドの移動を通知
  emit('moveSlide', dragIdx, insertIdx);
  
  draggingSlideIdx.value = null;
  dropLinePosition.value = null;
}
</script>
<style>
@import '../assets/common.css';

.slide-list-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
  padding-bottom: 24px;
}

.slide-list-container::-webkit-scrollbar {
  width: 6px;
}

.slide-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.slide-list-container::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.slide-list-container::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* ドラッグ&ドロップ関連のスタイル */
.slide-list-menu ul li.dragging {
  opacity: 0.5;
  transform: scale(0.98);
  box-shadow: 0 4px 12px #007aff33;
}

/* ドロップライン */
.drop-line {
  height: 3px;
  margin: 2px 8px;
  padding: 0;
  background: transparent;
  pointer-events: none;
  display: flex;
  align-items: center;
}

.drop-indicator {
  width: 100%;
  height: 3px;
  background: #007aff;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 122, 255, 0.5);
  animation: dropLineGlow 1s ease-in-out infinite alternate;
}

@keyframes dropLineGlow {
  0% {
    box-shadow: 0 1px 3px rgba(0, 122, 255, 0.5);
  }
  100% {
    box-shadow: 0 1px 6px rgba(0, 122, 255, 0.8), 0 0 12px rgba(0, 122, 255, 0.4);
  }
}

/* スライド追加ボタンのスタイル調整 */
.add-slide-btn {
  background: #e3f0ff !important;
  color: #007aff !important;
  font-weight: bold;
}

.add-slide-btn:hover {
  background: #b3e0ff !important;
}
</style> 