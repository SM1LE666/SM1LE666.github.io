(function () {
  const PROXY_BASE = "";
  const _countryCache = {};
  const _playerCache = {};
  const _statsCache = {};

  function emptyAvgStats() {
    return {
      totalMatches: 0,
      totalKills: 0,
      totalDeaths: 0,
      kd: "0.00",
      avgKills: "0.0",
      avgDeaths: "0.0",
      avgHs: 0,
      totalHs: 0,
    };
  }

  function extractNicknameFromUrl(input) {
    if (!input) return null;

    try {
      if (input.includes("faceit.com/")) {
        const url = decodeURIComponent(input);
        const patterns = [
          /players(?:-details)?\/([^/]+)(?:\/|$)/i,
          /players\/([^/]+)(?:\/|$)/i,
          /\/([^/]+)\/csgo$/i,
          /\/([^/]+)\/cs2$/i,
        ];

        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match && match[1]) return match[1];
        }
      }
      return input;
    } catch {
      return input;
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async function getPlayerData(nickname) {
    const playerNickname = extractNicknameFromUrl(nickname);

    if (_playerCache[playerNickname]) {
      return _playerCache[playerNickname];
    }

    const data = await fetchJson(
      `${PROXY_BASE}/api/player?nickname=${encodeURIComponent(playerNickname)}`,
    );
    _playerCache[playerNickname] = data;
    return data;
  }

  async function getStatsData(playerId, gameId) {
    const cacheKey = `${playerId}_${gameId}`;

    if (_statsCache[cacheKey]) {
      return _statsCache[cacheKey];
    }

    const data = await fetchJson(
      `${PROXY_BASE}/api/stats?playerId=${encodeURIComponent(
        playerId,
      )}&gameId=${encodeURIComponent(gameId)}`,
    );
    _statsCache[cacheKey] = data;
    return data;
  }

  async function getCurrentElo(playerId, gameId, fallbackElo) {
    try {
      const response = await fetch(
        `${PROXY_BASE}/api/history?playerId=${encodeURIComponent(
          playerId,
        )}&gameId=${encodeURIComponent(gameId)}&limit=1`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) return fallbackElo;

      const data = await response.json();
      const latestMatch = data.items?.[0];
      return latestMatch?.elo?.current || fallbackElo;
    } catch {
      return fallbackElo;
    }
  }

  function countryNameFromCache(countryData) {
    if (typeof countryData === "string") return countryData;
    const currentLang = window.currentLanguage || "en";
    return currentLang === "ru" ? countryData.rus : countryData.eng;
  }

  async function getCountryName(countryCode) {
    const normalizedCode =
      typeof countryCode === "string"
        ? countryCode.trim().toUpperCase()
        : countryCode;

    if (!normalizedCode || normalizedCode === "Н/Д") {
      return (window.currentLanguage || "en") === "ru" ? "Неизвестно" : "Unknown";
    }

    if (_countryCache[normalizedCode]) {
      return countryNameFromCache(_countryCache[normalizedCode]);
    }

    try {
      const response = await fetch(
        `/api/server?action=country&code=${encodeURIComponent(normalizedCode)}`,
      );
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData && (proxyData.name_common || proxyData.name)) {
          const engName = proxyData.name_common || proxyData.name;
          _countryCache[normalizedCode] = {
            rus: proxyData.name_native || engName,
            eng: engName,
          };
          return countryNameFromCache(_countryCache[normalizedCode]);
        }
      }
    } catch {
      // fall through to Intl
    }

    try {
      const locale = window.currentLanguage || "en";
      if (typeof Intl !== "undefined" && Intl.DisplayNames) {
        const dnName = new Intl.DisplayNames([locale === "ru" ? "ru" : "en"], {
          type: "region",
        }).of(normalizedCode);
        if (dnName) return dnName;
      }
    } catch {
      // ignore
    }

    return normalizedCode;
  }

  function calculateAvgStats(lifetime, segments, gameId) {
    try {
      if (gameId !== "cs2" || !lifetime || typeof lifetime !== "object") {
        return emptyAvgStats();
      }

      const totalMatches = parseInt(lifetime["Total Matches"] || "0", 10);
      const totalKills = parseInt(
        lifetime["Total Kills with extended stats"] || "0",
        10,
      );
      const kdRatio = parseFloat(lifetime["Average K/D Ratio"] || "0");
      const totalDeaths =
        kdRatio > 0 && totalKills > 0 ? Math.round(totalKills / kdRatio) : 0;

      return {
        totalMatches,
        totalKills,
        totalDeaths,
        kd: kdRatio.toFixed(2),
        avgKills:
          totalMatches > 0 ? (totalKills / totalMatches).toFixed(1) : "0.0",
        avgDeaths:
          totalMatches > 0 ? (totalDeaths / totalMatches).toFixed(1) : "0.0",
        avgHs: parseFloat(lifetime["Average Headshots %"] || "0"),
        totalHs: parseInt(lifetime["Total Headshots %"] || "0", 10),
      };
    } catch (error) {
      console.error("Ошибка при расчете средних показателей:", error);
      return emptyAvgStats();
    }
  }

  function calculateMapScore(winRate, kd, avgKills, matches, gameId) {
    const normalizedWinRate = Math.min(Math.max(winRate, 0), 100);
    const isCs2 = gameId === "cs2";
    const normalizedKD = Math.min(
      Math.max(isCs2 ? ((kd - 0.7) / 1.3) * 100 : (kd - 0.5) * 100, 0),
      100,
    );
    const normalizedAvgKills = Math.min(
      Math.max((avgKills / (isCs2 ? 25 : 20)) * 100, 0),
      100,
    );
    const reliabilityFactor = isCs2
      ? Math.min(0.7 + (matches - 5) * 0.03, 1.0)
      : Math.min(0.7 + (matches - 3) * 0.04, 1.0);

    const score =
      normalizedWinRate * 0.4 +
      normalizedKD * 0.25 +
      normalizedAvgKills * 0.2 +
      100 * reliabilityFactor * 0.15;

    return Math.round(score * 10) / 10;
  }

  function readSegmentMatches(segment) {
    return parseInt(
      segment.stats?.["Matches"] || segment.stats?.["Total Matches"] || "0",
      10,
    );
  }

  function readSegmentKills(segment) {
    return parseInt(
      segment.stats?.["Kills"] ||
        segment.stats?.["Total Kills"] ||
        segment.stats?.["Total Kills with extended stats"] ||
        "0",
      10,
    );
  }

  function analyzeMaps(segments, gameId, ignoreMinMatches = false) {
    try {
      const minMatches = gameId === "cs2" ? 5 : 3;
      const validMaps = (segments || []).filter((segment) => {
        if (!segment.label || !segment.stats) return false;
        return ignoreMinMatches || readSegmentMatches(segment) >= minMatches;
      });

      if (validMaps.length === 0) {
        return { bestMap: null, worstMap: null, allMaps: [] };
      }

      const mapStats = validMaps.map((segment) => {
        const matches = readSegmentMatches(segment);
        const kills = readSegmentKills(segment);
        let deaths = parseInt(
          segment.stats?.["Deaths"] || segment.stats?.["Total Deaths"] || "0",
          10,
        );

        if (deaths === 0 && kills > 0) {
          const segmentKD = parseFloat(
            segment.stats?.["K/D Ratio"] ||
              segment.stats?.["Average K/D Ratio"] ||
              "0",
          );
          if (segmentKD > 0) deaths = Math.round(kills / segmentKD);
        }

        const kd = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
        const avgKills = matches > 0 ? kills / matches : 0;
        const winRate = parseFloat(segment.stats?.["Win Rate %"] || "0");

        return {
          name: segment.label || "Неизвестная карта",
          matches,
          winRate,
          kills,
          deaths,
          kd,
          avgKills,
          hs: parseFloat(segment.stats?.["Average Headshots %"] || "0"),
          totalHs: parseInt(segment.stats?.["Total Headshots %"] || "0", 10),
          score: calculateMapScore(winRate, kd, avgKills, matches, gameId),
        };
      });

      mapStats.sort((a, b) => b.score - a.score);

      return {
        bestMap: mapStats[0] || null,
        worstMap: mapStats.length > 1 ? mapStats[mapStats.length - 1] : null,
        allMaps: mapStats,
      };
    } catch (error) {
      console.error("Ошибка при анализе карт:", error);
      return { bestMap: null, worstMap: null, allMaps: [] };
    }
  }

  function formatNumber(number) {
    try {
      return new Intl.NumberFormat().format(number);
    } catch {
      return String(number);
    }
  }

  function getAllMapsStats(segments) {
    try {
      if (!segments || !Array.isArray(segments)) return [];

      return segments
        .filter((segment) => segment.label && segment.stats)
        .map((segment) => {
          const matches = readSegmentMatches(segment);
          const kills = readSegmentKills(segment);
          const deaths = parseInt(
            segment.stats?.["Deaths"] || segment.stats?.["Total Deaths"] || "0",
            10,
          );
          const clutchKeys = [
            "Total 1v1 Wins",
            "Total 1v2 Wins",
            "Total 1v3 Wins",
            "Total 1v4 Wins",
            "Total 1v5 Wins",
          ];
          const clutches = clutchKeys.reduce((sum, key) => {
            const parsed = parseInt(segment.stats?.[key], 10);
            return sum + (!isNaN(parsed) && parsed >= 0 ? parsed : 0);
          }, 0);
          const kd = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;

          return {
            name: segment.label || "Unknown Map",
            matches,
            winRate: parseFloat(segment.stats?.["Win Rate %"] || "0"),
            kills,
            deaths,
            kd: kd.toFixed(2),
            avgKills: (matches > 0 ? kills / matches : 0).toFixed(1),
            adr: parseFloat(
              segment.stats?.["Average Damage per Round"] ||
                segment.stats?.["ADR"] ||
                segment.stats?.["Damage/Round"] ||
                "0",
            ).toFixed(1),
            clutches,
          };
        });
    } catch (error) {
      console.error("Error getting maps stats:", error);
      return [];
    }
  }

  const FaceitAPI = {
    extractNicknameFromUrl,
    getPlayerData,
    getStatsData,
    getCurrentElo,
    getCountryName,
    calculateAvgStats,
    analyzeMaps,
    formatNumber,
    getAllMapsStats,
  };

  if (typeof window !== "undefined") {
    window.FaceitAPI = FaceitAPI;
    window.FaceitService = FaceitAPI;
  }
})();
