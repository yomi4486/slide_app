<template>
  <div class="add-bar">
    <button @click="$emit('addElement', 'image')">＋ 画像追加</button>
    <button @click="$emit('addElement', 'text')">＋ テキスト追加</button>
    <button @click="$emit('addElement', 'rect')">＋ 四角形追加</button>
    <button @click="$emit('saveSlides')">💾 保存</button>
    <button @click="() => fileInput.click()">📂 開く</button>
    <button @click="$emit('newSlides')">🆕 新規</button>
    <button @click="$emit('localSave')">💾 ローカル保存</button>
    <input type="file" ref="fileInput" style="display:none" accept="application/json" @change="onFileChange" />
  </div>
</template>
<script setup>
import { ref } from 'vue'
const fileInput = ref(null)
const emit = defineEmits(['addElement', 'saveSlides', 'openSlides', 'newSlides'])
function onFileChange(e) {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (evt) => {
      emit('openSlides', evt.target.result)
    }
    reader.readAsText(file)
  }
  e.target.value = '' // 同じファイルを連続で選択できるように
}
</script>
<style>
@import '../assets/common.css';
</style> 