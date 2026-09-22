(function () {
  class Config {
    constructor() {
      this.loaded = false;
      this.apiBaseUrl = "https://api.faceit.com";
    }

    async loadConfig() {
      this.loaded = true;
      return true;
    }
  }

  window.Config = new Config();

  window.AppState = {
    playerStats: null,
    isInitialized: false,
    currentPlayerProfile: null,
    sidebarManager: null,
    lastHandledPath: null,
    currentLanguage: "en",
  };
})();
