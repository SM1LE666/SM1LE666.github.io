/**
 * FACEIT API Handler
 */

const FaceitAPI = (function () {
  const FACEIT_API_URL = "https://open.faceit.com/data/v4";

  // Новая функция для вызова вашего сервера, чтобы получить данные с API, не раскрывая ключ
  async function callBackend(endpoint, options = {}) {
    const backendUrl = `/api/faceit/${endpoint}`;
    try {
      const response = await fetch(backendUrl, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Ошибка вызова бекенда:", error);
      throw error;
    }
  }

  async function getPlayerData(nickname) {
    try {
      const playerNickname = extractNicknameFromUrl(nickname);
      const data = await callBackend(`players?nickname=${encodeURIComponent(playerNickname)}`);
      return data;
    } catch (error) {
      console.error("Ошибка при получении данных игрока:", error);
      throw error;
    }
  }

  async function getStatsData(playerId, gameId) {
    try {
      const data = await callBackend(`players/${playerId}/stats/${gameId}`);
      return data;
    } catch (error) {
      console.error("Ошибка при получении статистики игрока:", error);
      throw error;
    }
  }

  async function getCurrentElo(playerId, gameId, fallbackElo) {
    try {
      const data = await callBackend(`players/${playerId}/history?game=${gameId}&limit=1`);
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

  const extractNicknameFromUrl = (input) => {
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
  };

  return {
    extractNicknameFromUrl,
    getPlayerData,
    getStatsData,
    getCurrentElo,
  };
})();

// Экспортируем API в глобальную область видимости
window.FaceitAPI = FaceitAPI;