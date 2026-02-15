// Resolve a FACEIT (CS2) player by Steam profile link or SteamID64.
// Input: ?steam=<steam profile url | steamid64 | vanity>
// Output: Faceit player JSON (or 404)

function extractSteamId64FromInput(input) {
  if (!input) return { steamid64: null, vanity: null };
  const raw = String(input).trim();

  // steamid64 directly
  if (/^\d{17}$/.test(raw)) return { steamid64: raw, vanity: null };

  // Try parse URL
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);

    // /profiles/<steamid64>
    if (parts[0] === "profiles" && /^\d{17}$/.test(parts[1] || "")) {
      return { steamid64: parts[1], vanity: null };
    }

    // /id/<vanity>
    if (parts[0] === "id" && (parts[1] || "")) {
      return { steamid64: null, vanity: parts[1] };
    }

    // fallthrough: maybe user pasted something else
  } catch {
    // not a URL
  }

  // Treat as vanity (steamcommunity.com/id/<vanity> without full url)
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(raw))
    return { steamid64: null, vanity: raw };

  return { steamid64: null, vanity: null };
}

async function resolveVanityToSteamId64(vanity) {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) {
    const err = new Error("STEAM_WEB_API_KEY is not set");
    // @ts-ignore
    err.statusCode = 500;
    throw err;
  }

  const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${encodeURIComponent(
    key
  )}&vanityurl=${encodeURIComponent(vanity)}`;

  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await r.json().catch(() => null);

  const steamid = data?.response?.steamid;
  if (!steamid) {
    const err = new Error("Unable to resolve Steam vanity URL");
    // @ts-ignore
    err.statusCode = 404;
    throw err;
  }

  return String(steamid);
}

async function fetchFaceitPlayerBySteamId64(steamid64) {
  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) {
    const err = new Error("FACEIT_API_KEY is not set");
    // @ts-ignore
    err.statusCode = 500;
    throw err;
  }

  // FACEIT: find player by game + game_player_id
  const url = `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${encodeURIComponent(
    steamid64
  )}`;

  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const text = await r.text();
  if (!r.ok) {
    const err = new Error(text || `FACEIT API error ${r.status}`);
    // @ts-ignore
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
      res
        .status(400)
        .json({ ok: false, error: "steam query param is required" });
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
    res
      .status(200)
      .json({ ok: true, steamid64: resolvedSteamId64, player: data });
  } catch (e) {
    const status = Number(e?.statusCode || 500);
    res.status(status).json({ ok: false, error: String(e?.message || e) });
  }
}
