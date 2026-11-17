import dns from "node:dns";

// Принудительно используем IPv4 для предотвращения ошибок DNS (ENOTFOUND / ETIMEDOUT)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

// Resolve a FACEIT (CS2) player by Steam profile link, SteamID64, or vanity name.
// Input: ?steam=<steam profile url | steamid64 | vanity>
// Output: Faceit player JSON (or 404/400/500)

function extractSteamId64FromInput(input) {
  if (!input) return { steamid64: null, vanity: null };
  let raw = String(input).trim();

  // 1. Прямой ввод 17-значного SteamID64
  if (/^\d{17}$/.test(raw)) {
    return { steamid64: raw, vanity: null };
  }

  // 2. Добавляем https://, если ссылка передана без протокола (://steamcommunity.com...)
  if (/^(www\.)?steamcommunity\.com\//i.test(raw)) {
    raw = "https://" + raw;
  }

  // 3. Парсинг полной ссылки Steam
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);

    // Формат /profiles/<steamid64>
    if (parts.at(0) === "profiles" && /^\d{17}$/.test(parts.at(1) || "")) {
      return { steamid64: parts.at(1), vanity: null };
    }

    // Формат /id/<vanity>
    if (parts.at(0) === "id" && parts.at(1)) {
      return { steamid64: null, vanity: parts.at(1) };
    }
  } catch {
    // Ввод не является URL, проверяем дальше как vanity
  }

  // 4. Обычный vanity-никнейм (Custom URL без ссылки)
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(raw)) {
    return { steamid64: null, vanity: raw };
  }

  return { steamid64: null, vanity: null };
}

async function resolveVanityToSteamId64(vanity) {
   const url =
    "https://steamcommunity.com" +
    encodeURIComponent(vanity) +
    "/?xml=1";


  let r;
  try {
    r = await fetch(url, {
      headers: {
        Accept: "application/xml, text/xml",
        "User-Agent": "Mozilla/5.0",
      },
    });
  } catch (networkErr) {
    const err = new Error("Steam community network error on URL [" + url + "]: " + networkErr.message);
    err.cause = networkErr.cause;
    err.statusCode = 502;
    throw err;
  }


  if (!r.ok) {
    const err = new Error("Steam community HTTP error: " + r.status);
    err.statusCode = r.status;
    throw err;
  }

  const xml = await r.text();
  const match = xml.match(/<steamID64>(\d{17})<\/steamID64>/);

  if (!match || !match.at(1)) {
    const err = new Error('Unable to resolve Steam vanity URL "' + vanity + '"');
    err.statusCode = 404;
    throw err;
  }

  return match.at(1);
}

async function fetchFaceitPlayerBySteamId64(steamid64) {
  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) {
    const err = new Error("FACEIT_API_KEY is not set");
    err.statusCode = 500;
    throw err;
  }

  const url =
    "https://faceit.com" +
    encodeURIComponent(steamid64);

  let r;
  try {
    r = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apiKey,
      },
    });
  } catch (networkErr) {
    const err = new Error("FACEIT API network error: " + networkErr.message);
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
    const cause = e?.cause
      ? " (" + (e.cause.code || e.cause.message || e.cause) + ")"
      : "";
    res
      .status(status)
      .json({ ok: false, error: String(e?.message || e) + cause });
  }
}
