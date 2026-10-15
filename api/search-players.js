import { proxyFaceitJson } from "../lib/faceit-proxy.js";

// GET /api/search-players?nickname=abc
// Проксирует FACEIT search/players (только CS2, до 20 игроков с похожим ником).
export default async function handler(req, res) {
  try {
    const nickname = String(req.query?.nickname ?? "").trim();

    if (nickname.length < 2 || nickname.length > 40 || /[\/\\]/.test(nickname)) {
      res.status(400).json({ error: "Invalid nickname" });
      return;
    }

    const url = `https://open.faceit.com/data/v4/search/players?nickname=${encodeURIComponent(
      nickname,
    )}&game=cs2&offset=0&limit=20`;

    await proxyFaceitJson(res, url);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
