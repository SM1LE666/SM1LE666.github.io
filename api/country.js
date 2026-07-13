export default async function handler(req, res) {
  // Allow requests from the site and from localhost for local testing
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const code = (req.query.code || "").toString().trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "code required" });

    // Use restcountries as the backend data source
    const apiUrl = `https://restcountries.com/v3.1/alpha/${encodeURIComponent(
      code,
    )}`;

    const r = await fetch(apiUrl);
    if (!r.ok) {
      return res.status(502).json({ error: "failed to fetch country data" });
    }

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

    res.status(200).json(result);
  } catch (err) {
    console.error("country proxy error", err);
    res.status(500).json({ error: "internal" });
  }
}
