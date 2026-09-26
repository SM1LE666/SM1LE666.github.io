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

  function normalizePath(path) {
    if (!path) return "/";
    return String(path).trim() || "/";
  }

  function buildPlayerUrl(nickname) {
    if (!nickname) return "/";
    return `/player/${encodeURIComponent(String(nickname).trim())}`;
  }

  function buildModalUrl(modalRoute) {
    if (!modalRoute) return "/";
    return `/${modalRoute}`;
  }

  function resolvePath(path) {
    const normalizedPath = normalizePath(path);

    const modalMatch = normalizedPath.match(
      /^\/(reaction-test|support|contact|aim-trainer)$/i,
    );
    if (modalMatch && modalMatch[1]) {
      return {
        type: "modal",
        modalId: modalMatch[1].toLowerCase(),
        path: normalizedPath,
      };
    }

    const playerMatch = normalizedPath.match(/^\/player\/(.+)$/i);
    if (playerMatch && playerMatch[1]) {
      return {
        type: "player",
        path: normalizedPath,
        nickname: decodeURIComponent(playerMatch[1]),
      };
    }

    return {
      type: "home",
      path: "/",
      nickname: null,
    };
  }

  window.AppRouter = {
    normalizePath,
    buildPlayerUrl,
    buildModalUrl,
    resolvePath,
  };
})();
