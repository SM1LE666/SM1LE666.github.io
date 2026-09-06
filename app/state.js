(function () {
  const AppState = {
    playerStats: null,
    isInitialized: false,
    currentPlayerProfile: null,
    sidebarManager: null,
    lastHandledPath: null,
    currentLanguage: 'en',
    REQUEST_DELAY: 30,
  };

  AppState.sync = function syncState() {
    const state = this;
    state.lastHandledPath = state.lastHandledPath ?? null;
    return state;
  };

  if (typeof window !== 'undefined') {
    window.AppState = AppState;
  }
})();
