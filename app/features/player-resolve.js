(function () {
  function isSteamInput(value) {
    if (!value) return false;
    const v = String(value).trim();
    if (!v) return false;
    if (/^\d{17}$/.test(v)) return true;
    if (/steamcommunity\.com\/(id|profiles)\//i.test(v)) return true;
    return false;
  }

  async function resolveFaceitPlayerFromSteam(steamInput) {
    const url = `/api/faceit-by-steam?steam=${encodeURIComponent(
      String(steamInput).trim(),
    )}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      throw new Error(data?.error || `Steam resolve failed (${r.status})`);
    }
    if (!data?.player) {
      throw new Error("Faceit player not found for this Steam account");
    }
    return data.player;
  }

  function checkFaceitAPI() {
    if (typeof window.FaceitAPI === "undefined") {
      console.error("FaceitAPI не загружен!");
      return false;
    }

    const requiredMethods = [
      "getPlayerData",
      "getStatsData",
      "getCurrentElo",
      "getCountryName",
      "calculateAvgStats",
      "analyzeMaps",
      "formatNumber",
    ];

    const missingMethods = requiredMethods.filter(
      (method) => typeof window.FaceitAPI[method] !== "function",
    );

    if (missingMethods.length > 0) {
      console.error("Отсутствуют методы FaceitAPI:", missingMethods);
      return false;
    }

    console.log("FaceitAPI успешно загружен и готов к работе");
    return true;
  }

  window.AppPlayerResolve = {
    isSteamInput,
    resolveFaceitPlayerFromSteam,
    checkFaceitAPI,
  };
})();
