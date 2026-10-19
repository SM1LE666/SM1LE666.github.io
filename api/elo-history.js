// /api/elo-history?playerId=<faceit player_id>
// Возвращает ELO игрока после каждого сыгранного матча CS2:
//   { items: [{ matchId, date, elo }] }

const PAGE_SIZE = 100;
const MAX_PAGES = 15;

module.exports = async function handler(req, res) {
  const playerId = String(req.query?.playerId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(playerId)) {
    return res.status(400).json({ error: "Invalid playerId" });
  }

  const items = [];
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url =
        `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2` +
        `?page=${page}&size=${PAGE_SIZE}`;

      let upstream;
      try {
        upstream = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; FaceitAnalyze/1.0)",
          },
        });
      } catch (fetchErr) {
        // Ошибка сети или таймаут отдельного запроса страницы
        break;
      }

      if (!upstream || !upstream.ok) {
        if (page === 0) {
          // Если первая страница упала, возвращаем пустой список (200),
          // чтобы фронтенд корректно переключился на Net Wins вместо 500 ошибки.
          return res.status(200).json({ items: [] });
        }
        break;
      }

      let data;
      try {
        data = await upstream.json();
      } catch (jsonErr) {
        break; // Если FACEIT отдавал HTML капчу или битый JSON
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
    // Глобальная страховка от любых падений
    console.error("Elo history fetch error:", error);
  }

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  return res.status(200).json({ items });
};
