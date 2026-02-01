export default async function handler(req, res) {
  try {
    const apiKey = process.env.FACEIT_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "FACEIT_API_KEY is not set" });
      return;
    }

    const playerId = req.query?.playerId;
    const gameId = req.query?.gameId;

    if (!playerId || !gameId) {
      res.status(400).json({ error: "playerId and gameId are required" });
      return;
    }

    const url = `https://open.faceit.com/data/v4/players/${encodeURIComponent(
      String(playerId)
    )}/stats/${encodeURIComponent(String(gameId))}`;

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
