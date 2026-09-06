import { proxyFaceitJson } from "../lib/faceit-proxy.js";

export default async function handler(req, res) {
  try {
    const playerId = req.query?.playerId;
    const gameId = req.query?.gameId;
    const limit = req.query?.limit ?? "20";
    const offset = req.query?.offset ?? "0";

    if (!playerId || !gameId) {
      res.status(400).json({ error: "playerId and gameId are required" });
      return;
    }

    const url = `https://open.faceit.com/data/v4/players/${encodeURIComponent(
      String(playerId),
    )}/history?game=${encodeURIComponent(
      String(gameId),
    )}&limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(
      String(offset),
    )}`;

    await proxyFaceitJson(res, url);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
