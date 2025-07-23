<template>
  <div class="slideshow keynote-slide slide-canvas"
    @mousedown.self="(e) => { props.onCanvasMouseDown && props.onCanvasMouseDown(e); props.clearSelection && props.clearSelection() }"
    :style="canvasStyle"
  >
    <div
      v-for="(el, i) in props.elements"
      :key="i"
      class="slide-el"
      :class="{ selected: props.selectedElements && props.selectedElements.includes(i) }"
      :style="{ ...props.elementStyle(el, i), opacity: el.opacity ?? 1 }"
      @mousedown="(e) => { if (props.disabled) return; if (el.type === 'text' && props.isEditingText(i)) return; props.startDrag(i, e) }"
      @click="(e) => { if (props.disabled) return; props.selectElement(i, e.shiftKey || e.ctrlKey || e.metaKey) }"
    >
      <img v-if="el.type === 'image'" :src="el.content" class="slide-el-img" />
      <div v-else-if="el.type === 'rect'" :style="{ width: '100%', height: '100%', background: el.background || '#1976d2', borderRadius: '8px', boxShadow: el.shadow ? '0 2px 8px #0003' : 'none', border: '1.5px solid #1976d2', opacity: el.opacity ?? 1 }"></div>
      <template v-else>
        <div
          v-if="!props.isEditingText(i)"
          class="slide-el-text"
          :style="props.textElementStyle(el)"
          @dblclick="() => { if (props.disabled) return; props.startInlineEdit(i, el.content) }"
          @mousedown.stop
        >
          {{ el.content }}
        </div>
        <input
          v-else
          class="slide-el-text-input"
          :style="props.textElementStyle(el)"
          :value="props.inlineEditValue"
          ref="props.inlineEditInput"
          @input="$emit('update:inlineEditValue', $event.target.value)"
          @blur="props.finishInlineEdit(true)"
          @keydown.enter.stop.prevent="props.finishInlineEdit(true)"
          @keydown.esc.stop.prevent="props.finishInlineEdit(false)"
          @mousedown.stop
          @dblclick.stop
        />
      </template>
      <!-- リサイズハンドル（選択中のみ、スライドショーでなければ） -->
      <template v-if="props.selectedElements && props.selectedElements.includes(i) && !props.slideshow">
        <div
          v-for="dir in ['nw','ne','sw','se','n','e','s','w']"
          :key="dir"
          class="resize-handle"
          :class="'handle-' + dir"
          @pointerdown.stop="(e) => { if (props.disabled) return; props.startResize(i, dir, e) }"
        ></div>
      </template>
    </div>
    <!-- ドラッグ選択用の矩形 -->
    <div v-if="props.dragSelect" :style="{
      position: 'absolute',
      left: Math.min(props.dragRect.x, props.dragRect.x + props.dragRect.w) + 'px',
      top: Math.min(props.dragRect.y, props.dragRect.y + props.dragRect.h) + 'px',
      width: Math.abs(props.dragRect.w) + 'px',
      height: Math.abs(props.dragRect.h) + 'px',
      background: '#1976d233',
      border: '2px dashed #1976d2',
      zIndex: 1000,
      pointerEvents: 'none',
    }"></div>
  </div>
</template>
<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
const props = defineProps([
  'elements',
  'selectedElements',
  'selectElement',
  'startDrag',
  'startResize',
  'isEditingText',
  'startInlineEdit',
  'finishInlineEdit',
  'inlineEditValue',
  'inlineEditInput',
  'textElementStyle',
  'elementStyle',
  'clearSelection',
  'disabled',
  'canvasWidth',
  'canvasHeight',
  'canvasLeft',
  'canvasTop',
  'dragSelect',
  'dragRect',
  'canvasWrapper',
  'onCanvasMouseDown',
  'onCanvasMouseMove',
  'onCanvasMouseUp',
  'zoom',
  'slideshow', // 追加
  'background', // 追加
])
const canvasStyle = computed(() => {
  const style = {
    width: props.canvasWidth + 'px',
    height: props.canvasHeight + 'px',
    minWidth: 0,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    background: props.background || '#fff',
    borderRadius: props.slideshow ? '0' : '8px',
    boxShadow: props.slideshow ? 'none' : '0 8px 32px #0002, 0 1.5px 6px #0001',
  }
  if (props.canvasLeft !== undefined) style.left = props.canvasLeft + 'px'
  if (props.canvasTop !== undefined) style.top = props.canvasTop + 'px'
  return style
})
// ドラッグ選択のmousemove/upイベントを動的に付け外し
let moveHandler = null
let upHandler = null
watch(() => props.dragSelect, (val) => {
  if (val) {
    moveHandler = (e) => props.onCanvasMouseMove(e)
    upHandler = (e) => props.onCanvasMouseUp(e)
    window.addEventListener('mousemove', moveHandler)
    window.addEventListener('mouseup', upHandler)
  } else {
    if (moveHandler) window.removeEventListener('mousemove', moveHandler)
    if (upHandler) window.removeEventListener('mouseup', upHandler)
  }
})
onBeforeUnmount(() => {
  if (moveHandler) window.removeEventListener('mousemove', moveHandler)
  if (upHandler) window.removeEventListener('mouseup', upHandler)
})
defineEmits(['update:inlineEditValue'])
</script>
<style>
@import '../assets/common.css';
.slide-canvas, .slide-el, .slide-el-text, .slide-el-text-input {
  font-family: 'Inter', 'Helvetica Neue', Arial, 'Hiragino Sans', 'Meiryo', sans-serif !important;
}
.slide-canvas {
  position: relative;
  overflow: hidden;
}
.slide-canvas {
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 32px #0002, 0 1.5px 6px #0001;
}
.slide-canvas[slideshow] {
  border-radius: 0 !important;
  box-shadow: none !important;
}
</style> 