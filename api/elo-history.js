// /api/elo-history?playerId=<faceit player_id>
// Возвращает ELO игрока после каждого сыгранного матча CS2:
//   { items: [{ matchId, date, elo }] }

const PAGE_SIZE = 100;
const MAX_PAGES = 5; // Ограничиваем до 5 страниц (500 матчей), чтобы снизить шанс таймаута

module.exports = async function handler(req, res) {
  const playerId = String(req.query?.playerId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(playerId)) {
    return res.status(400).json({ error: "Invalid playerId" });
  }

  const items = [];
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2?page=${page}&size=${PAGE_SIZE}`;

      let upstream;
      try {
        upstream = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Referer: "https://www.faceit.com/",
          },
        });
      } catch (netErr) {
        break; // При сетевой ошибке прерываем цикл, но не падаем
      }

      if (!upstream || !upstream.ok) {
        break; // Если FACEIT вернул 403, 429 или 500, просто прекращаем сбор
      }

      let data;
      try {
        data = await upstream.json();
      } catch (jsonErr) {
        break; // Если пришел невалидный JSON или HTML заглушка
      }

      const list = Array.isArray(data)
        ? data
        : data?.items || data?.payload || [];
      if (!list.length) break;

      for (const match of list) {
        if (!match || typeof match !== "object") continue;
        const elo = Number(match.elo ?? match.elo_after ?? match.eloAfter);
        const matchId = match.matchId || match.match_id;
        if (!matchId || !Number.isFinite(elo) || elo <= 0) continue;
        items.push({ matchId, date: Number(match.date) || null, elo });
      }

      if (list.length < PAGE_SIZE) break;
    }
  } catch (error) {
    console.error("Elo history non-critical error:", error);
  }

  // Всегда возвращаем статус 200 и собранные данные (или пустой массив),
  // чтобы фронтенд в trends.js не ломался.
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  return res.status(200).json({ items });
};
