import { proxyFaceitJson } from "../lib/faceit-proxy.js";

export default async function handler(req, res) {
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
          return new Intl.DisplayNames([locale], { type: "region" }).of(code);
        } catch {
          return null;
        }
      };

      const englishName = getRegionName("en");
      return res.status(200).json({
        code,
        name_common: englishName || code,
        name_native: getRegionName("ru") || englishName || code,
      });
    }

    if (action === "match-info") {
      const matchId = req.query?.matchId;
      if (!matchId) {
        return res.status(400).json({ error: "matchId is required" });
      }

      return proxyFaceitJson(
        res,
        `https://open.faceit.com/data/v4/matches/${encodeURIComponent(
          String(matchId),
        )}`,
      );
    }

    return res.status(400).json({ error: "unknown action" });
  } catch (err) {
    console.error("server api error", err);
    return res.status(500).json({ error: "internal" });
  }
}
