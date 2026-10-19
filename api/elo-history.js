// /api/elo-history?playerId=<faceit player_id>
// Возвращает ELO игрока после каждого сыгранного матча CS2:
//   { items: [{ matchId, date, elo }] }   (date - время матча в миллисекундах)
//
// ВНИМАНИЕ: официальный FACEIT Data API не отдаёт ELO по матчам, поэтому здесь используется
// внутренний (недокументированный) API статистики по времени api.faceit.com. Он может
// измениться или ограничить запросы. Если эндпоинт вернёт ошибку или пустой список,
// сайт продолжит работать: график просто покажет баланс побед вместо ELO.

const PAGE_SIZE = 100;
const MAX_PAGES = 15; // до 1500 матчей; запросы идут последовательно, чтобы уложиться в лимит времени функции

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

      const upstream = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; FaceitAnalyze/1.0)",
        },
      });

      if (!upstream.ok) {
        if (page === 0) {
          return res.status(502).json({ error: "ELO history unavailable" });
        }
        break; // отдаём то, что успели получить
      }

      const data = await upstream.json();
      const list = Array.isArray(data) ? data : data?.items || [];
      if (!list.length) break;

      for (const match of list) {
        const elo = Number(match.elo ?? match.elo_after ?? match.eloAfter);
        const matchId = match.matchId || match.match_id;
        if (!matchId || !Number.isFinite(elo) || elo <= 0) continue;
        items.push({ matchId, date: Number(match.date) || null, elo });
      }

      if (list.length < PAGE_SIZE) break;
    }
  } catch (error) {
    if (!items.length) {
      return res.status(502).json({ error: "ELO history unavailable" });
    }
  }

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  return res.status(200).json({ items });
};
