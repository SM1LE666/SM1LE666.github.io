export default async function handler(req, res) {
  try {
    const apiKey = process.env.FACEIT_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "FACEIT_API_KEY is not set" });
      return;
    }

    const nickname = req.query?.nickname;
    if (!nickname) {
      res.status(400).json({ error: "nickname is required" });
      return;
    }

    const url = `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(
      String(nickname)
    )}`;

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
