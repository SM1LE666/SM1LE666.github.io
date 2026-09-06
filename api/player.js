import { proxyFaceitJson } from "../lib/faceit-proxy.js";

export default async function handler(req, res) {
  try {
    const nickname = req.query?.nickname;
    if (!nickname) {
      res.status(400).json({ error: "nickname is required" });
      return;
    }

    await proxyFaceitJson(
      res,
      `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(
        String(nickname),
      )}`,
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
