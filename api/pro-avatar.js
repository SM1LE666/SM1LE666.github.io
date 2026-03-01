export default async function handler(req, res) {
  try {
    // Simple proxy to fetch a pro player's avatar URL.
    // Uses Liquipedia (free, no key) via MediaWiki API.
    // NOTE: This is best-effort: if not found, returns null avatar.

    const name = String(req.query?.name || "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    // Cache for 12 hours at the edge
    res.setHeader(
      "Cache-Control",
      "s-maxage=43200, stale-while-revalidate=86400"
    );

    const endpoint = "https://liquipedia.net/counterstrike/api.php";
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "256",
      titles: name,
    });

    const r = await fetch(`${endpoint}?${params.toString()}`, {
      headers: {
        "User-Agent": "faceit-analyze/1.0 (avatar proxy)",
        Accept: "application/json",
      },
    });

    if (!r.ok) {
      res
        .status(r.status)
        .json({ error: `Liquipedia request failed: ${r.status}` });
      return;
    }

    const data = await r.json();
    const pages = data?.query?.pages;

    let avatar = null;
    let pageTitle = null;

    if (pages && typeof pages === "object") {
      const firstKey = Object.keys(pages)[0];
      const page = pages[firstKey];
      pageTitle = page?.title || null;
      avatar = page?.thumbnail?.source || null;
    }

    res.status(200).json({ name, pageTitle, avatar });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
