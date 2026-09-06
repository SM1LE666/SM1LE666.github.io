import { proxyFaceitJson } from "../lib/faceit-proxy.js";

export default async function handler(req, res) {
  try {
    const playerId = req.query?.playerId;
    const gameId = req.query?.gameId;

    if (!playerId || !gameId) {
      res.status(400).json({ error: "playerId and gameId are required" });
      return;
    }

    await proxyFaceitJson(
      res,
      `https://open.faceit.com/data/v4/players/${encodeURIComponent(
        String(playerId),
      )}/stats/${encodeURIComponent(String(gameId))}`,
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
