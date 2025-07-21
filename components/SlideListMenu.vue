<template>
  <aside class="slide-list-menu">
    <div class="slide-list-title">スライド一覧</div>
    <ul>
      <li v-for="(slide, idx) in slides" :key="idx" :class="{ active: idx === current }" @click="$emit('goTo', idx)">
        <div class="slide-thumb">
          <img v-if="slide.elements.find(e => e.type === 'image')" :src="slide.elements.find(e => e.type === 'image')?.content" alt="thumb" />
          <div v-else class="slide-thumb-placeholder">No Image</div>
        </div>
        <div class="slide-thumb-text">
          {{ slide.elements.find(e => e.type === 'text')?.content?.slice(0, 16) || '（テキストなし）' }}
        </div>
      </li>
      <li class="slide-list-divider" aria-hidden="true"></li>
      <li class="add-slide-btn" @click="$emit('addSlide')">
        <div class="slide-thumb slide-thumb-placeholder">＋</div>
        <div class="slide-thumb-text">スライド追加</div>
      </li>
    </ul>
  </aside>
</template>
<script setup>
defineProps(['slides', 'current'])
defineEmits(['goTo'])
</script>
<style>
@import '../assets/common.css';
.add-slide-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 12px;
  margin: 4px 8px;
  background: #e3f0ff;
  color: #007aff;
  font-weight: bold;
  transition: background 0.15s, box-shadow 0.15s;
}
.add-slide-btn:hover {
  background: #b3e0ff;
}
.slide-list-divider {
  height: 0.5px;
  background: linear-gradient(90deg, #e0e6ef 0%, #f7fafd 100%);
  margin: 8px 0 8px 0;
  border: none;
  pointer-events: none;
}
</style> 