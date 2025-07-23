<template>
  <div class="edit-section keynote-panel right-edit-panel modern-edit-panel">
    <template v-if="currentEl">
      <h3 class="edit-title">要素編集</h3>
      <!-- 既存の要素編集UI -->
      <div class="edit-group" v-if="currentEl?.type === 'image'">
        <label class="edit-label">画像URL</label>
        <input v-model="currentEl.content" class="edit-input" />
        <div class="edit-group">
          <label class="edit-label">透明度</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="range" min="0" max="1" step="0.01" v-model.number="currentEl.opacity" style="flex:1;" />
            <input type="number" min="0" max="1" step="0.01" v-model.number="currentEl.opacity" class="edit-input short" />
          </div>
        </div>
      </div>
      <template v-if="currentEl?.type === 'text'">
        <div class="edit-group">
          <label class="edit-label">テキスト</label>
          <textarea v-model="currentEl.content" class="edit-input" rows="2" style="resize:vertical; min-height:38px;"></textarea>
        </div>
        <div class="edit-row">
          <div class="edit-group">
            <label class="edit-label">フォントサイズ</label>
            <input type="number" v-model.number="currentEl.fontSize" min="8" max="120" class="edit-input short" />
          </div>
          <div class="edit-group color-group">
            <label class="edit-label">色</label>
            <div class="color-row">
              <input type="color" v-model="currentEl.color" class="edit-color" />
              <input v-model="currentEl.color" class="edit-input short" />
            </div>
          </div>
        </div>
        <div class="edit-group">
          <label class="edit-label">透明度</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="range" min="0" max="1" step="0.01" v-model.number="currentEl.opacity" style="flex:1;" />
            <input type="number" min="0" max="1" step="0.01" v-model.number="currentEl.opacity" class="edit-input short" />
          </div>
        </div>
        <div class="edit-group">
          <label class="edit-label">文字揃え</label>
          <select v-model="currentEl.textAlign" class="edit-input short">
            <option value="center">中央</option>
            <option value="left">左</option>
            <option value="right">右</option>
          </select>
        </div>
      </template>
      <template v-if="currentEl?.type === 'rect'">
        <div class="edit-group color-group">
          <label class="edit-label">塗りつぶし色</label>
          <div class="color-row">
            <input type="color" v-model="currentEl.background" class="edit-color" />
            <input v-model="currentEl.background" class="edit-input short" />
          </div>
        </div>
        <div class="edit-group">
          <label class="edit-label">透明度</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="range" min="0" max="1" step="0.01" v-model.number="currentEl.opacity" style="flex:1;" />
            <input type="number" min="0" max="1" step="0.01" v-model.number="currentEl.opacity" class="edit-input short" />
          </div>
        </div>
      </template>
      <div class="edit-row">
        <div class="edit-group">
          <label class="edit-label">X</label>
          <input type="number" v-model.number="currentEl.x" class="edit-input short" />
        </div>
        <div class="edit-group">
          <label class="edit-label">Y</label>
          <input type="number" v-model.number="currentEl.y" class="edit-input short" />
        </div>
        <div class="edit-group">
          <label class="edit-label">幅</label>
          <input type="number" v-model.number="currentEl.width" class="edit-input short" />
        </div>
        <div class="edit-group">
          <label class="edit-label">高さ</label>
          <input type="number" v-model.number="currentEl.height" class="edit-input short" />
        </div>
      </div>
      <div class="edit-actions">
        <button class="edit-btn delete" @click="$emit('removeElement')">削除</button>
        <div class="zorder-group">
          <button class="edit-btn zorder" @click="$emit('moveElementZ', 'up')">⬆️ 前面へ</button>
          <button class="edit-btn zorder" @click="$emit('moveElementZ', 'down')">⬇️ 背面へ</button>
        </div>
      </div>
    </template>
    <template v-else>
      <h3 class="edit-title">スライド編集</h3>
      <div class="edit-group color-group">
        <label class="edit-label">背景色</label>
        <div class="color-row">
          <input type="color" v-model="slideBackgroundProxy" class="edit-color" />
          <input v-model="slideBackgroundProxy" class="edit-input short" />
        </div>
      </div>
    </template>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
const props = defineProps(['currentEls', 'slideBackground'])
const emit = defineEmits(['removeElement', 'moveElementZ', 'update:slideBackground'])
const currentEl = computed(() => props.currentEls?.[0] || null)

// スライド背景色編集用の双方向バインディング
const slideBackgroundProxy = ref(props.slideBackground || '#ffffff')
watch(() => props.slideBackground, (val) => {
  slideBackgroundProxy.value = val || '#ffffff'
})
watch(slideBackgroundProxy, (val) => {
  emit('update:slideBackground', val)
})
</script>
<style>
@import '../assets/common.css';
.modern-edit-panel {
  padding: 28px 22px 20px 22px;
  border-radius: 18px;
  box-shadow: 0 4px 24px #007aff11;
  background: #fafdff;
  min-width: 280px;
  max-width: 340px;
  margin: 0 auto;
  text-align: left;
  box-sizing: border-box;
}
.edit-title {
  text-align: center;
  color: #007aff;
  font-size: 1.25em;
  font-weight: 700;
  margin-bottom: 18px;
  letter-spacing: 0.02em;
}
.edit-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
.edit-group, .edit-row, .edit-actions, .zorder-group {
  align-items: flex-start;
  justify-content: flex-start;
}
.edit-label {
  font-size: 0.98em;
  color: #007aff;
  font-weight: 600;
  margin-bottom: 2px;
}
.edit-input {
  padding: 7px 10px;
  border: 1.2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1em;
  background: #f7fafd;
  outline: none;
  box-shadow: 0 1px 4px #007aff11;
  transition: border 0.2s, box-shadow 0.2s;
  width: 100%;
  max-width: 100%;
}
.edit-input:focus {
  border: 1.2px solid #007aff;
  box-shadow: 0 2px 8px #007aff22;
}
.edit-input.short {
  width: 70px;
  min-width: 0;
  max-width: 70px;
}
.edit-color {
  width: 36px;
  height: 32px;
  border: none;
  background: none;
  padding: 0;
}
.color-group .color-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
}
.edit-row {
  display: flex;
  flex-direction: row;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.edit-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 22px;
  gap: 10px;
}
.edit-btn {
  padding: 10px 22px;
  font-size: 1em;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #007aff 60%, #4fc3f7 100%);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px #007aff22;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
  min-width: 90px;
}
.edit-btn.delete {
  background: linear-gradient(90deg, #ff5f5f 60%, #ffb3b3 100%);
}
.edit-btn.zorder {
  background: #e3f0ff;
  color: #007aff;
  font-weight: 700;
  margin-left: 4px;
  padding: 10px 14px;
  min-width: 80px;
}
.edit-btn.zorder:hover {
  background: #b3e0ff;
}
.zorder-group {
  display: flex;
  gap: 8px;
}
</style> 