(function () {
  function ensureFaceitApi() {
    if (typeof window === "undefined" || !window.FaceitAPI) {
      throw new Error("FaceitAPI is not loaded");
    }
    return window.FaceitAPI;
  }

  const FaceitService = {
    async getPlayerData(nickname, apiKey) {
      return ensureFaceitApi().getPlayerData(nickname, apiKey);
    },

    async getStatsData(playerId, gameId, apiKey) {
      return ensureFaceitApi().getStatsData(playerId, gameId, apiKey);
    },

    async getCurrentElo(playerId, gameId, fallbackElo) {
      return ensureFaceitApi().getCurrentElo(playerId, gameId, fallbackElo);
    },

    async getCountryName(countryCode) {
      return ensureFaceitApi().getCountryName(countryCode);
    },

    calculateAvgStats(lifetime, segments, gameId) {
      return ensureFaceitApi().calculateAvgStats(lifetime, segments, gameId);
    },

    analyzeMaps(segments, gameId) {
      return ensureFaceitApi().analyzeMaps(segments, gameId);
    },

    formatNumber(value) {
      return ensureFaceitApi().formatNumber(value);
    },

    normalizeMapKey(mapName) {
      const api = ensureFaceitApi();
      if (typeof api.normalizeMapKey === "function") {
        return api.normalizeMapKey(mapName);
      }
      if (typeof window.SidebarManager?.normalizeMapKey === "function") {
        return window.SidebarManager.normalizeMapKey(mapName);
      }
      return String(mapName || "")
        .trim()
        .toLowerCase()
        .replace(/^de_/, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    },
  };

  if (typeof window !== "undefined") {
    window.FaceitService = FaceitService;
  }
})();
