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
    </ul>
  </aside>
</template>
<script setup>
defineProps(['slides', 'current'])
defineEmits(['goTo'])
</script>
<style>
@import '../assets/common.css';
</style> 