const FaceitAPI = (function () {
  const USE_PROXY = true;
  const PROXY_BASE = ""; // same-origin

  // Оставляем для потенциального локального фолбэка (не используется при USE_PROXY=true)
  const FACEIT_API_URL = "https://open.faceit.com/data/v4";

  // Кэш для данных
  const _countryCache = {};
  const _playerCache = {};
  const _statsCache = {};

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
    } catch (error) {
      console.error("Ошибка при извлечении никнейма из URL:", error);
      return input;
    }
  }

  async function getPlayerData(nickname, apiKey) {
    try {
      const playerNickname = extractNicknameFromUrl(nickname);

      if (_playerCache[playerNickname]) {
        return _playerCache[playerNickname];
      }

      const url = USE_PROXY
        ? `${PROXY_BASE}/api/player?nickname=${encodeURIComponent(
            playerNickname
          )}`
        : `${FACEIT_API_URL}/players?nickname=${encodeURIComponent(
            playerNickname
          )}`;

      const response = await fetchWithCORS(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Ошибка API: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      _playerCache[playerNickname] = data;
      return data;
    } catch (error) {
      console.error("Ошибка при получении данных игрока:", error);
      throw error;
    }
  }

  async function getStatsData(playerId, gameId, apiKey) {
    try {
      const cacheKey = `${playerId}_${gameId}`;

      if (_statsCache[cacheKey]) {
        return _statsCache[cacheKey];
      }

      const url = USE_PROXY
        ? `${PROXY_BASE}/api/stats?playerId=${encodeURIComponent(
            playerId
          )}&gameId=${encodeURIComponent(gameId)}`
        : `${FACEIT_API_URL}/players/${playerId}/stats/${gameId}`;

      const response = await fetchWithCORS(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Ошибка API: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      _statsCache[cacheKey] = data;
      return data;
    } catch (error) {
      console.error("Ошибка при получении статистики игрока:", error);
      throw error;
    }
  }

  async function getCurrentElo(playerId, gameId, fallbackElo, apiKey) {
    try {
      const url = USE_PROXY
        ? `${PROXY_BASE}/api/history?playerId=${encodeURIComponent(
            playerId
          )}&gameId=${encodeURIComponent(gameId)}&limit=1`
        : `${FACEIT_API_URL}/players/${playerId}/history?game=${gameId}&limit=1`;

      const response = await fetchWithCORS(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return fallbackElo;
      }

      const data = await response.json();
      const items = data.items;
      if (!items || items.length === 0) {
        return fallbackElo;
      }

      const latestMatch = items[0];
      return latestMatch.elo?.current || fallbackElo;
    } catch (error) {
      console.error("Ошибка при получении актуального ELO:", error);
      return fallbackElo;
    }
  }

  async function getCountryName(countryCode) {
    if (!countryCode || countryCode === "Н/Д") {
      // Возвращаем "Неизвестно" в зависимости от текущего языка
      const currentLang = window.currentLanguage || "ru";
      const result = currentLang === "ru" ? "Неизвестно" : "Unknown";
      console.log("Возвращаем для неизвестной страны:", result);
      return result;
    }

    if (_countryCache[countryCode]) {
      const result = getCurrentLanguageCountryName(_countryCache[countryCode]);
      return result;
    }

    try {
      const response = await fetch(
        `https://restcountries.com/v3.1/alpha/${countryCode}`
      );
      if (!response.ok) {
        throw new Error("Не удалось получить данные о стране");
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        throw new Error("Нет данных о стране");
      }

      // Сохраняем полные данные о стране в кэш для обоих языков
      const countryData = {
        rus: data[0].translations.rus?.common || data[0].name.common,
        eng: data[0].name.common,
      };
      _countryCache[countryCode] = countryData;

      // Возвращаем название в зависимости от текущего языка
      return getCurrentLanguageCountryName(countryData);
    } catch (error) {
      console.warn("Ошибка при получении названия страны:", error);
      return countryCode;
    }
  }

  // Новая функция для получения названия страны на текущем языке
  function getCurrentLanguageCountryName(countryData) {
    if (typeof countryData === "string") {
      return countryData; // Старый формат кэша
    }

    // Получаем текущий язык из window.currentLanguage или по умолчанию 'ru'
    const currentLang = window.currentLanguage || "ru";
    return currentLang === "ru" ? countryData.rus : countryData.eng;
  }

  // Функция для обновления названий стран при смене языка
  function updateCountryNames() {
    // Находим карточку игрока
    const playerCard = document.querySelector(".player-card");
    if (!playerCard) return;

    // Находим параграф со страной
    const playerInfo = playerCard.querySelector(".player-info");
    if (!playerInfo) return;

    const paragraphs = playerInfo.querySelectorAll("p");
    paragraphs.forEach(async (p) => {
      const text = p.textContent;
      // Ищем параграф со страной
      if (text.includes("Страна:") || text.includes("Country:")) {
        // Извлекаем код страны из данных игрока (если есть)
        const playerData = window.currentPlayerData;
        if (playerData && playerData.country) {
          const countryCode = playerData.country;

          try {
            // Получаем переведенное название страны
            const newCountryName = await getCountryName(countryCode);
            // Обновляем текст параграфа
            const currentLang = window.currentLanguage || "ru";
            const countryLabel = currentLang === "ru" ? "Страна" : "Country";
            p.textContent = `${countryLabel}: ${newCountryName}`;
          } catch (error) {
            console.error("Ошибка при обновлении названия страны:", error);
            // Fallback: обновляем только подпись
            const countryValue = text.split(":")[1]?.trim();
            if (countryValue) {
              const currentLang = window.currentLanguage || "ru";
              const countryLabel = currentLang === "ru" ? "Страна" : "Country";
              p.textContent = `${countryLabel}: ${countryValue}`;
            }
          }
        }
      }
    });
  }

  function calculateAvgStats(lifetime, segments, gameId) {
    try {
      // Проверяем, что это именно CS:2
      if (gameId !== "cs2") {
        return {
          totalMatches: 0,
          totalKills: 0,
          totalDeaths: 0,
          kd: "0.00",
          avgKills: "0.0",
          avgDeaths: "0.0",
        };
      }

      if (!lifetime || typeof lifetime !== "object") {
        return {
          totalMatches: 0,
          totalKills: 0,
          totalDeaths: 0,
          kd: "0.00",
          avgKills: "0.0",
          avgDeaths: "0.0",
        };
      }

      // Используем только CS:2 ключи
      const totalMatches = parseInt(lifetime["Total Matches"] || "0", 10);
      const totalKills = parseInt(
        lifetime["Total Kills with extended stats"] || "0",
        10
      );

      // Используем Average K/D Ratio (правильный K/D)
      const kdRatio = parseFloat(lifetime["Average K/D Ratio"] || "0");

      // Вычисляем смерти через K/D и килы
      let totalDeaths = 0;
      if (kdRatio > 0 && totalKills > 0) {
        totalDeaths = Math.round(totalKills / kdRatio);
      }

      // Используем готовый K/D от API (Average K/D Ratio)
      const kd = kdRatio.toFixed(2);

      // Вычисляем средние значения за матч одинаково для убийств и смертей
      const avgKills =
        totalMatches > 0 ? (totalKills / totalMatches).toFixed(1) : "0.0";
      const avgDeaths =
        totalMatches > 0 ? (totalDeaths / totalMatches).toFixed(1) : "0.0";

      return {
        totalMatches,
        totalKills,
        totalDeaths,
        kd,
        avgKills,
        avgDeaths,
      };
    } catch (error) {
      console.error("Ошибка при расчете средних показателей:", error);
      return {
        totalMatches: 0,
        totalKills: 0,
        totalDeaths: 0,
        kd: "0.00",
        avgKills: "0.0",
        avgDeaths: "0.0",
      };
    }
  }

  function analyzeMaps(segments, gameId, ignoreMinMatches = false) {
    try {
      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        return { bestMap: null, worstMap: null, allMaps: [] };
      }
      // Для Maps игнорируем ограничение по количеству матчей
      let validMaps;
      if (ignoreMinMatches) {
        validMaps = segments.filter(
          (segment) => segment.label && segment.stats
        );
      } else {
        const MIN_MATCHES = gameId === "cs2" ? 5 : 3;
        validMaps = segments.filter((segment) => {
          const matches = parseInt(
            segment.stats?.["Matches"] ||
              segment.stats?.["Total Matches"] ||
              "0",
            10
          );
          return matches >= MIN_MATCHES;
        });
      }
      if (validMaps.length === 0) {
        return { bestMap: null, worstMap: null, allMaps: [] };
      }

      const mapStats = validMaps.map((segment) => {
        const mapName = segment.label || "Неизвестная карта";
        const matches = parseInt(
          segment.stats?.["Matches"] || segment.stats?.["Total Matches"] || "0",
          10
        );
        const winRate = parseFloat(segment.stats?.["Win Rate %"] || "0");

        // Используем правильные ключи для киллов и смертей в сегментах
        const kills = parseInt(
          segment.stats?.["Kills"] ||
            segment.stats?.["Total Kills"] ||
            segment.stats?.["Total Kills with extended stats"] ||
            "0",
          10
        );

        // Пытаемся получить смерти или вычислить их через K/D
        let deaths = parseInt(
          segment.stats?.["Deaths"] || segment.stats?.["Total Deaths"] || "0",
          10
        );

        // Если смертей нет, но есть K/D, вычисляем смерти
        if (deaths === 0 && kills > 0) {
          const segmentKD = parseFloat(
            segment.stats?.["K/D Ratio"] ||
              segment.stats?.["Average K/D Ratio"] ||
              "0"
          );
          if (segmentKD > 0) {
            deaths = Math.round(kills / segmentKD);
          }
        }

        const kd = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
        const avgKills = matches > 0 ? kills / matches : 0;

        // Комплексная формула оценки карты (0-100) с учетом специфики игры
        const mapScore = calculateMapScore(
          winRate,
          kd,
          avgKills,
          matches,
          gameId
        );

        return {
          name: mapName,
          matches,
          winRate,
          kills,
          deaths,
          kd,
          avgKills,
          score: mapScore, // Добавляем общую оценку
        };
      });

      // Сортируем карты по общей оценке вместо только винрейта
      mapStats.sort((a, b) => b.score - a.score);

      const bestMap = mapStats.length > 0 ? mapStats[0] : null;
      const worstMap =
        mapStats.length > 1 ? mapStats[mapStats.length - 1] : null;

      return { bestMap, worstMap, allMaps: mapStats };
    } catch (error) {
      console.error("Ошибка при анализе карт:", error);
      return { bestMap: null, worstMap: null, allMaps: [] };
    }
  }

  /**
   * Вычисляет комплексную оценку карты от 0 до 100 с учетом специфики игры
   * @param {number} winRate - Винрейт в процентах (0-100)
   * @param {number} kd - K/D соотношение
   * @param {number} avgKills - Средние убийства за матч
   * @param {number} matches - Количество матчей на карте
   * @param {string} gameId - ID игры (cs2 или csgo)
   * @returns {number} - Оценка от 0 до 100
   */
  function calculateMapScore(winRate, kd, avgKills, matches, gameId) {
    // Нормализуем каждую метрику к диапазону 0-100

    // 1. Винрейт уже в процентах (0-100)
    const normalizedWinRate = Math.min(Math.max(winRate, 0), 100);

    // 2. K/D нормализуем: для CS:2 используем более современные стандарты
    // CS:2: 0.7 = 0%, 1.0 = 40%, 1.5 = 70%, 2.0+ = 100%
    // CS:GO: 0.5 = 0%, 1.0 = 50%, 2.0+ = 100% (старые стандарты)
    let normalizedKD;
    if (gameId === "cs2") {
      normalizedKD = Math.min(Math.max(((kd - 0.7) / 1.3) * 100, 0), 100);
    } else {
      normalizedKD = Math.min(Math.max((kd - 0.5) * 100, 0), 100);
    }

    // 3. Средние убийства: для CS:2 матчи часто короче, корректируем стандарты
    // CS:2: 15 киллов = 50%, 25+ киллов = 100%
    // CS:GO: 10 киллов = 50%, 20+ киллов = 100%
    let normalizedAvgKills;
    if (gameId === "cs2") {
      normalizedAvgKills = Math.min(Math.max((avgKills / 25) * 100, 0), 100);
    } else {
      normalizedAvgKills = Math.min(Math.max((avgKills / 20) * 100, 0), 100);
    }

    // 4. Коэффициент надежности: для CS:2 требуем больше матчей
    let reliabilityFactor;
    if (gameId === "cs2") {
      // CS:2: 5 матчей = 70%, 15+ матчей = 100%
      reliabilityFactor = Math.min(0.7 + (matches - 5) * 0.03, 1.0);
    } else {
      // CS:GO: 3 матча = 70%, 10+ матчей = 100%
      reliabilityFactor = Math.min(0.7 + (matches - 3) * 0.04, 1.0);
    }

    // Веса для каждой метрики (сумма = 100%)
    const weights = {
      winRate: 0.4, // 40% - самый важный показатель
      kd: 0.25, // 25% - индивидуальная эффективность
      avgKills: 0.2, // 20% - активность в игре
      reliability: 0.15, // 15% - надежность данных
    };

    // Вычисляем итоговую оценку
    const score =
      normalizedWinRate * weights.winRate +
      normalizedKD * weights.kd +
      normalizedAvgKills * weights.avgKills +
      100 * reliabilityFactor * weights.reliability;

    return Math.round(score * 10) / 10; // Округляем до 1 знака после запятой
  }

  function formatNumber(number) {
    try {
      return new Intl.NumberFormat().format(number);
    } catch (error) {
      return String(number);
    }
  }

  // Функция для обхода CORS (может не работать на всех браузерах)
  async function fetchWithCORS(url, options = {}) {
    // Попробуем использовать fetch сmode: 'cors'
    try {
      return await fetch(url, {
        ...options,
        mode: "cors",
      });
    } catch (error) {
      // Если CORS не работает, используем прокси
      return await fetchWithProxy(url, options);
    }
  }

  // Функция для использования публичного CORS прокси
  async function fetchWithProxy(url, options = {}) {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      url
    )}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }

      const data = await response.json();
      const originalData = JSON.parse(data.contents);

      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(originalData),
      };
    } catch (error) {
      console.error("Proxy request failed:", error);
      throw error;
    }
  }
  // Функция для получения статистики по картам без сложной обработки
  function getAllMapsStats(segments) {
    try {
      if (!segments || !Array.isArray(segments)) return [];

      return segments
        .filter((segment) => segment.label && segment.stats)
        .map((segment) => {
          const mapName = segment.label || "Unknown Map";

          const matches = parseInt(
            segment.stats?.["Matches"] ||
              segment.stats?.["Total Matches"] ||
              "0",
            10
          );

          const winRate = parseFloat(segment.stats?.["Win Rate %"] || "0");
          const kills = parseInt(
            segment.stats?.["Kills"] ||
              segment.stats?.["Total Kills"] ||
              segment.stats?.["Total Kills with extended stats"] ||
              "0",
            10
          );

          const deaths = parseInt(
            segment.stats?.["Deaths"] || segment.stats?.["Total Deaths"] || "0",
            10
          );

          // Добавляем ADR (средний урон в раунде)
          const adr = parseFloat(
            segment.stats?.["Average Damage per Round"] ||
              segment.stats?.["ADR"] ||
              segment.stats?.["Damage/Round"] ||
              "0"
          );

          // Получаем количество выигранных клатчей - упрощенная версия
          const clutchKeys = [
            "Total 1v1 Wins",
            "Total 1v2 Wins",
            "Total 1v3 Wins",
            "Total 1v4 Wins",
            "Total 1v5 Wins",
          ];

          let clutches = 0;
          for (const key of clutchKeys) {
            const value = segment.stats?.[key];
            if (value !== undefined && value !== null) {
              const parsedValue = parseInt(value, 10);
              if (!isNaN(parsedValue) && parsedValue >= 0) {
                clutches += parsedValue;
              }
            }
          }

          const kd = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
          const avgKills = matches > 0 ? kills / matches : 0;

          return {
            name: mapName,
            matches,
            winRate,
            kills,
            deaths,
            kd: kd.toFixed(2),
            avgKills: avgKills.toFixed(1),
            adr: adr.toFixed(1),
            clutches: clutches,
          };
        });
    } catch (error) {
      console.error("Error getting maps stats:", error);
      return [];
    }
  }

  return {
    extractNicknameFromUrl,
    getPlayerData,
    getStatsData,
    getCurrentElo,
    getCountryName,
    getCurrentLanguageCountryName,
    updateCountryNames,
    calculateAvgStats,
    analyzeMaps,
    formatNumber,
    getAllMapsStats,
  };
})();

// Экспортируем API в глобальную область видимости
window.FaceitAPI = FaceitAPI;
