<template>
  <div class="share-view">
    <div v-if="shareLoading" class="loading">
      <p>スライドを読み込み中...</p>
    </div>
    
    <div v-else-if="shareError" class="error">
      <h2>エラー</h2>
      <p>{{ shareError }}</p>
      <button @click="$emit('navigateToHome')">ホームに戻る</button>
    </div>
    
    <div v-else-if="shareSlideData && shareSlideData.slides && shareSlideData.slides.length > 0" class="shared-slide">
      <header class="share-header">
        <h1>{{ shareSlideData.title }}</h1>
        <div class="slide-info">
          <span>作成者: {{ shareSlideData.userName }}</span>
          <span>更新日: {{ formatDate(shareSlideData.updatedAt?.toDate()) }}</span>
        </div>
        <button class="start-slideshow-btn" @click="$emit('startSlideshow')">
          ▶ スライドショー開始
        </button>
        <button @click="$emit('navigateToHome')" style="margin-left: 10px;" class="start-slideshow-btn">
          🏠 ホームに戻る
        </button>
      </header>
      
      <main class="slide-viewer">
        <div class="slide-container">
          <div style="position:relative; width:100%; aspect-ratio:16/9; margin:0 auto; background:transparent; max-width: 1280px;">
            <SlideCanvas
              v-if="shareSlideData && shareSlideData.slides && shareSlideData.slides[currentSlide] && shareSlideData.slides[currentSlide].elements"
              :elements="shareSlideData.slides[currentSlide].elements"
              :selectedElements="[]"
              :canvasWidth="baseWidth"
              :canvasHeight="baseHeight"
              :zoom="1"
              :elementStyle="elementStyle"
              :textElementStyle="textElementStyle"
              :isEditingText="() => false"
              :background="shareSlideData.slides[currentSlide].background || '#ffffff'"
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
        </div>
        <div class="slide-navigation">
          <button @click="$emit('goToPrevSlide')" :disabled="currentSlide === 0">‹ 前</button>
          <span class="slide-counter">{{ currentSlide + 1 }} / {{ shareSlideData.slides.length }}</span>
          <button @click="$emit('goToNextSlide')" :disabled="currentSlide === shareSlideData.slides.length - 1">次 ›</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import SlideCanvas from './SlideCanvas.vue'

const props = defineProps({
  shareLoading: Boolean,
  shareError: String,
  shareSlideData: Object,
  currentSlide: Number,
  baseWidth: Number,
  baseHeight: Number,
  elementStyle: Function,
  textElementStyle: Function
})

defineEmits([
  'navigateToHome',
  'startSlideshow',
  'goToPrevSlide',
  'goToNextSlide'
])

function formatDate(date) {
  if (!date) return ''
  return date.toLocaleString()
}
</script>

<style scoped>
/* 共有ページスタイル */
.share-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.shared-slide {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.loading, .error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
}

.error button {
  margin-top: 16px;
  padding: 8px 16px;
  border: none;
  background: #007aff;
  color: white;
  border-radius: 8px;
  cursor: pointer;
}

.share-header {
  background: white;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.share-header h1 {
  margin: 0 0 16px 0;
  color: #333;
}

.slide-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;
  color: #666;
}

.start-slideshow-btn {
  background: #007aff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.slide-viewer {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.slide-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.slide-navigation button {
  background: #007aff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.slide-navigation button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slide-counter {
  font-weight: 600;
  color: #333;
}

.slide-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  border-radius: 16px;
  padding: 24px;
}
</style>
