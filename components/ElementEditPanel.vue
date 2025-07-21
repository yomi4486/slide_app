<template>
  <div class="edit-section keynote-panel right-edit-panel">
    <h3>要素編集</h3>
    <label v-if="currentEl?.type === 'image'">
      画像URL：
      <input v-model="currentEl.content" />
    </label>
    <template v-if="currentEl?.type === 'text'">
      <label>
        テキスト：
        <input v-model="currentEl.content" />
      </label>
      <label>
        フォントサイズ：
        <input type="number" v-model.number="currentEl.fontSize" min="8" max="120" style="width:70px" /> px
      </label>
      <label>
        色：
        <input type="color" v-model="currentEl.color" style="width:40px;height:32px;vertical-align:middle;" />
        <input v-model="currentEl.color" style="width:80px;" />
      </label>
    </template>
    <label>
      X：<input type="number" v-model.number="currentEl.x" style="width:60px" />
      Y：<input type="number" v-model.number="currentEl.y" style="width:60px" />
    </label>
    <label>
      幅：<input type="number" v-model.number="currentEl.width" style="width:60px" />
      高さ：<input type="number" v-model.number="currentEl.height" style="width:60px" />
    </label>
    <label>
      <input type="checkbox" v-model="currentEl.shadow" /> 影をつける
    </label>
    <label>
      背景色：<input type="color" v-model="currentEl.background" style="width:40px;height:32px;vertical-align:middle;" />
      <input v-model="currentEl.background" style="width:80px;" placeholder="#RRGGBB or 空" />
    </label>
    <button @click="$emit('removeElement')">削除</button>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps(['currentEls'])
const currentEl = computed(() => props.currentEls?.[0] || null)
defineEmits(['removeElement'])
</script>
<style>
@import '../assets/common.css';
</style> 