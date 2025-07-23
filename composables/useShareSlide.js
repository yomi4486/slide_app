import { ref, nextTick } from 'vue'
import { getPublicSlide } from '../utils/firebase.js'

export function useShareSlide() {
  const shareSlideId = ref(null)
  const shareSlideData = ref(null)
  const shareLoading = ref(false)
  const shareError = ref(null)
  const currentSlide = ref(0) // 共有スライド表示用のカレントスライドインデックス

  async function loadSharedSlide(slideId) {
    shareLoading.value = true;
    shareError.value = null;
    shareSlideData.value = null;

    try {
      const data = await getPublicSlide(slideId);
      
      if (data && data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        // データが完全であることを確認
        let isValidData = true;
        for (let i = 0; i < data.slides.length; i++) {
          if (!data.slides[i] || !data.slides[i].elements) {
            isValidData = false;
            break;
          }
        }
        
        if (isValidData) {
          shareSlideData.value = data;
          currentSlide.value = 0; // 共有スライドのカレントインデックスを0にリセット
          
          // 少し待ってから確実に描画されるようにする
          await nextTick();
        } else {
          shareError.value = 'スライドデータに不整合があります';
        }
      } else {
        shareError.value = 'スライドが見つからないか、公開されていません';
      }
    } catch (error) {
      shareError.value = 'スライドの読み込みに失敗しました: ' + error.message;
    } finally {
      shareLoading.value = false;
    }
  }

  function goToPrevSlide() {
    if (shareSlideData.value && currentSlide.value > 0) {
      currentSlide.value--;
    }
  }

  function goToNextSlide() {
    if (shareSlideData.value && currentSlide.value < shareSlideData.value.slides.length - 1) {
      currentSlide.value++;
    }
  }

  // share画面用のキーボードハンドラー
  function handleShareKey(e, currentRoute, isSlideshow) {
    if (currentRoute !== 'share' || isSlideshow) return
    
    // テキスト編集中やinput/textareaにフォーカス時は無視
    const tag = document.activeElement?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea') return
    
    if (e.key === 'ArrowRight') {
      goToNextSlide()
      e.preventDefault()
    } else if (e.key === 'ArrowLeft') {
      goToPrevSlide()
      e.preventDefault()
    }
  }

  return {
    shareSlideId,
    shareSlideData,
    shareLoading,
    shareError,
    currentSlide,
    loadSharedSlide,
    goToPrevSlide,
    goToNextSlide,
    handleShareKey
  }
}
