import { ref } from 'vue'

export function useRouting() {
  const isHome = ref(true)
  const currentRoute = ref('home') // 'home', 'share'

  function checkCurrentRoute(loadSharedSlideCallback) {
    const path = window.location.pathname;
    
    if (path === '/') {
      currentRoute.value = 'home';
      isHome.value = true;
    } else if (path.startsWith('/share/')) {
      const slideId = path.replace('/share/', '');
      if (slideId) {
        currentRoute.value = 'share';
        isHome.value = false;
        if (loadSharedSlideCallback) {
          loadSharedSlideCallback(slideId);
        }
      }
    }
  }

  function navigateToHome() {
    window.history.pushState({}, '', '/');
    currentRoute.value = 'home';
    isHome.value = true;
  }

  return {
    isHome,
    currentRoute,
    checkCurrentRoute,
    navigateToHome
  }
}
