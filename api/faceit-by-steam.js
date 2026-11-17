function extractSteamId64FromInput(input) {
  if (!input) return { steamid64: null, vanity: null };
  let raw = String(input).trim();

  // 1. Прямой 17-значный SteamID64
  if (/^\d{17}$/.test(raw)) {
    return { steamid64: raw, vanity: null };
  }

  // 2. Убираем протокол и домен вручную через регулярное выражение (без new URL)
  const profileMatch = raw.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profileMatch && profileMatch.at(1)) {
    return { steamid64: profileMatch.at(1), vanity: null };
  }

  const vanityMatch = raw.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (vanityMatch && vanityMatch.at(1)) {
    return { steamid64: null, vanity: vanityMatch.at(1) };
  }

  // 3. Обычный vanity-никнейм
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(raw)) {
    return { steamid64: null, vanity: raw };
  }

  return { steamid64: null, vanity: null };
}

async function resolveVanityToSteamId64(vanity) {
  const key = (process.env.STEAM_WEB_API_KEY || "").trim();
  if (!key) {
    const err = new Error("STEAM_WEB_API_KEY is not set");
    err.statusCode = 500;
    throw err;
  }

  const proto = "https:" + "/" + "/";
  const host = "://steampowered.com";
  const path = "/" + "ISteamUser" + "/" + "ResolveVanityURL" + "/" + "v1" + "/";
  const query = "?key=" + encodeURIComponent(key) + "&vanityurl=" + encodeURIComponent(vanity);
  const fullUrl = proto + host + path + query;

  let r;
  try {
    r = await fetch(fullUrl, {
      headers: { Accept: "application/json" },
    });
  } catch (networkErr) {
    const err = new Error("Steam network error: " + networkErr.message);
    err.cause = networkErr.cause;
    err.statusCode = 502;
    throw err;
  }

  if (!r.ok) {
    const err = new Error("Steam API HTTP error: " + r.status);
    err.statusCode = r.status === 403 ? 500 : r.status;
    throw err;
  }

  const data = await r.json().catch(() => null);
  const steamid = data?.response?.steamid;

  if (!steamid) {
    const steamMsg = data?.response?.message || "No match";
    const err = new Error('Unable to resolve Steam vanity URL "' + vanity + '" (' + steamMsg + ")");
    err.statusCode = 404;
    throw err;
  }

  return String(steamid);
}

async function fetchFaceitPlayerBySteamId64(steamid64) {
  const apiKey = (process.env.FACEIT_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("FACEIT_API_KEY is not set");
    err.statusCode = 500;
    throw err;
  }

  const proto = "https:" + "/" + "/";
  const host = "://faceit.com";
  const path = "/" + "data" + "/" + "v4" + "/" + "players";
  const query = "?game=cs2&game_player_id=" + encodeURIComponent(steamid64);
  const fullUrl = proto + host + path + query;

  let r;
  try {
    r = await fetch(fullUrl, {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apiKey,
      },
    });
  } catch (networkErr) {
    const err = new Error("FACEIT network error: " + networkErr.message);
    err.cause = networkErr.cause;
    err.statusCode = 502;
    throw err;
  }

  const text = await r.text();
  if (!r.ok) {
    const err = new Error(text || "FACEIT API error " + r.status);
    err.statusCode = r.status;
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const input = req.query?.steam;
    if (!input) {
      res.status(400).json({ ok: false, error: "steam query param is required" });
      return;
    }

    const { steamid64, vanity } = extractSteamId64FromInput(input);

    const resolvedSteamId64 =
      steamid64 || (vanity ? await resolveVanityToSteamId64(vanity) : null);

    if (!resolvedSteamId64) {
      res.status(400).json({ ok: false, error: "Unable to parse Steam input" });
      return;
    }

    const data = await fetchFaceitPlayerBySteamId64(resolvedSteamId64);
    res.status(200).json({ ok: true, steamid64: resolvedSteamId64, player: data });
  } catch (e) {
    const status = Number(e?.statusCode || 500);
    const cause = e?.cause
      ? " (" + (e.cause.code || e.cause.message || e.cause) + ")"
      : "";
    res.status(status).json({ ok: false, error: String(e?.message || e) + cause });
  }
}
