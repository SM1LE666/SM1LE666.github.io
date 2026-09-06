import { proxyFaceitJson } from "../lib/faceit-proxy.js";

export default async function handler(req, res) {
  try {
    const matchId = req.query?.matchId;
    if (!matchId) {
      res.status(400).json({ error: "matchId is required" });
      return;
    }

    await proxyFaceitJson(
      res,
      `https://open.faceit.com/data/v4/matches/${encodeURIComponent(
        String(matchId),
      )}/stats`,
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
