const STEAMID64_BASE = 76561197960265728n;

function extractSteamId64FromInput(input) {
  if (!input) return { steamid64: null, vanity: null };
  let raw = String(input).trim();

  if (/^\d{17}$/.test(raw)) {
    return { steamid64: raw, vanity: null };
  }

  if (/^\d{1,10}$/.test(raw)) {
    const steam64 = (BigInt(raw) + STEAMID64_BASE).toString();
    return { steamid64: steam64, vanity: null };
  }

  let urlToParse = raw;
  if (/^(www\.)?steamcommunity\.com\//i.test(urlToParse)) {
    urlToParse = "https://" + urlToParse;
  }

  try {
    const url = new URL(urlToParse);
    if (url.hostname.endsWith("steamcommunity.com")) {
      const parts = url.pathname.split("/").filter(Boolean);

      if (parts[0] === "profiles" && parts[1]) {
        if (/^\d{17}$/.test(parts[1])) {
          return { steamid64: parts[1], vanity: null };
        }
        if (/^\d{1,10}$/.test(parts[1])) {
          const steam64 = (BigInt(parts[1]) + STEAMID64_BASE).toString();
          return { steamid64: steam64, vanity: null };
        }
      }

      if (parts[0] === "id" && parts[1]) {
        return { steamid64: null, vanity: parts[1] };
      }
    }
  } catch {
    // Игнорируем ошибку, если это не URL
  }

  if (/^[a-zA-Z0-9_-]{2,64}$/.test(raw)) {
    return { steamid64: null, vanity: raw };
  }

  return { steamid64: null, vanity: null };
}

async function resolveVanityToSteamId64(vanity) {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) {
    const err = new Error("STEAM_WEB_API_KEY is not set");
    err.statusCode = 500;
    throw err;
  }

  const baseUrl = "https://steampowered.com";
  const url = baseUrl + "?key=" + encodeURIComponent(key) + "&vanityurl=" + encodeURIComponent(vanity);

  const r = await fetch(url, { headers: { Accept: "application/json" } });

  if (!r.ok) {
    const err = new Error("Steam API HTTP error: " + r.status);
    err.statusCode = r.status === 403 ? 500 : 502;
    throw err;
  }

  const data = await r.json().catch(() => null);
  const response = data?.response;

  if (!response || response.success !== 1 || !response.steamid) {
    const reason = response?.message || "No match";
    const err = new Error("Unable to resolve Steam vanity URL: " + vanity + " (" + reason + ")");
    err.statusCode = 404;
    throw err;
  }

  return String(response.steamid);
}

async function fetchFaceitPlayerBySteamId64(steamid64) {
  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) {
    const err = new Error("FACEIT_API_KEY is not set");
    err.statusCode = 500;
    throw err;
  }

  const url = "https://faceit.com" + encodeURIComponent(steamid64);

  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + apiKey,
    },
  });

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
    res.status(status).json({ ok: false, error: String(e?.message || e) });
  }
}
