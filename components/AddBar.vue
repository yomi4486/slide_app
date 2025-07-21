<template>
  <div class="add-bar">
    <button @click="$emit('addElement', 'image')">＋ 画像追加</button>
    <button @click="$emit('addElement', 'text')">＋ テキスト追加</button>
  </div>
</template>
<script setup>
defineEmits(['addElement'])
</script>
<style>
@import '../assets/common.css';
</style> 