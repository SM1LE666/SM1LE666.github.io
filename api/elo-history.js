// /api/elo-history?playerId=<faceit player_id>
// Возвращает ELO игрока после каждого сыгранного матча CS2:
//   { items: [{ matchId, date, elo }] }   (date - время матча в миллисекундах)
//
const BROWSER_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.faceit.com",
  Referer: "https://www.faceit.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const PAGE_SIZE = 100;
const MAX_PAGES = 15; // до 1500 матчей; запросы идут последовательно, чтобы уложиться в лимит времени функции

export default async function handler(req, res) {
  const playerId = String(req.query?.playerId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(playerId)) {
    return res.status(400).json({ error: "Invalid playerId" });
  }

  const debug = String(req.query?.debug || "") === "1";
  const info = { pages: 0, rawSample: null, upstreamStatus: null };
  const items = [];
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url =
        `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2` +
        `?page=${page}&size=${PAGE_SIZE}`;

      const upstream = await fetch(url, { headers: BROWSER_HEADERS });

      info.upstreamStatus = upstream.status;
      if (!upstream.ok) {
        if (page === 0) {
          // upstreamStatus показывает, что ответил FACEIT (например, 403 = запрос отклонён)
          const snippet = debug
            ? (await upstream.text().catch(() => "")).slice(0, 200)
            : undefined;
          return res.status(502).json({
            error: "ELO history unavailable",
            upstreamStatus: upstream.status,
            ...(debug && { debug: info, bodySnippet: snippet }),
          });
        }
        break; // отдаём то, что успели получить
      }

      const data = await upstream.json();
      const list = Array.isArray(data) ? data : data?.items || [];
      if (!list.length) break;
      info.pages++;
      if (!info.rawSample) info.rawSample = list.slice(0, 2); // как выглядит ответ FACEIT

      for (const match of list) {
        // Формат ответа FACEIT (проверен на реальных данных): matchId и date лежат на верхнем уровне,
        // elo - ELO ПОСЛЕ матча, elo_delta - изменение за матч (elo - elo_delta = ELO до матча).
        const elo = Number(match.elo);
        const matchId = match.matchId;
        if (!matchId || !Number.isFinite(elo) || elo <= 0) continue;
        const delta = Number(match.elo_delta);
        items.push({
          matchId,
          date: Number(match.date) || null,
          elo,
          delta: Number.isFinite(delta) ? delta : null,
        });
      }

      if (list.length < PAGE_SIZE) break;
    }
  } catch (error) {
    if (!items.length) {
      return res.status(502).json({
        error: "ELO history unavailable",
        message: String(error?.message || error).slice(0, 120),
      });
    }
  }

  if (debug) {
    // ?debug=1: показать сырые данные и ничего не кешировать
    res.setHeader("Cache-Control", "no-store");
    return res
      .status(200)
      .json({ items: items.slice(0, 5), total: items.length, debug: info });
  }

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  return res.status(200).json({ items });
}
