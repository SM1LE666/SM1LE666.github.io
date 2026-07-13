export default async function handler(req, res) {
  // Allow same-origin clients; wildcard for convenience during deploy
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const action = (req.query.action || "").toString();

  try {
    if (action === "country") {
      const code = (req.query.code || "").toString().trim().toUpperCase();
      if (!code) return res.status(400).json({ error: "code required" });

      const apiUrl = `https://restcountries.com/v3.1/alpha/${encodeURIComponent(
        code,
      )}`;

      const r = await fetch(apiUrl);
      if (!r.ok)
        return res.status(502).json({ error: "failed to fetch country data" });
      const data = await r.json();
      if (!data || data.length === 0)
        return res.status(404).json({ error: "not found" });

      const countryData = data[0];
      const result = {
        code,
        name_common: countryData.name?.common || null,
        name_native:
          (countryData.translations && countryData.translations.rus?.common) ||
          countryData.name?.common ||
          null,
        raw: countryData,
      };
      return res.status(200).json(result);
    }

    if (action === "match-info") {
      const apiKey = process.env.FACEIT_API_KEY;
      if (!apiKey)
        return res.status(500).json({ error: "FACEIT_API_KEY is not set" });

      const matchId = req.query?.matchId;
      if (!matchId)
        return res.status(400).json({ error: "matchId is required" });

      const url = `https://open.faceit.com/data/v4/matches/${encodeURIComponent(String(matchId))}`;
      const r = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const text = await r.text();
      res.status(r.status);
      res.setHeader("Content-Type", "application/json");
      return res.send(text);
    }

    return res.status(400).json({ error: "unknown action" });
  } catch (err) {
    console.error("server api error", err);
    return res.status(500).json({ error: "internal" });
  }
}
