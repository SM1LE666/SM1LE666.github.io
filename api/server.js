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

      const getRegionName = (locale) => {
        try {
          if (typeof Intl === "undefined" || !Intl.DisplayNames) return null;
          const displayNames = new Intl.DisplayNames([locale], {
            type: "region",
          });
          return displayNames.of(code) || null;
        } catch (error) {
          return null;
        }
      };

      const englishName = getRegionName("en");
      const russianName = getRegionName("ru") || englishName;

      const result = {
        code,
        name_common: englishName || code,
        name_native: russianName || englishName || code,
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
