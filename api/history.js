export default async function handler(req, res) {
  try {
    const apiKey = process.env.FACEIT_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "FACEIT_API_KEY is not set" });
      return;
    }

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
    )}&limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`;

    const r = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const text = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
