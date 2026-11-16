(function () {
  const STEAMID64_BASE = 76561197960265728n;

  function isSteamInput(value) {
    if (!value) return false;
    const v = String(value).trim();
    if (!v) return false;
    // Разрешаем 17-цифровые ID, короткие AccountID (от 1 до 10 цифр) или ссылки Steam
    if (/^\d{1,10}$/.test(v) || /^\d{17}$/.test(v)) return true;
    if (/steamcommunity\.com\/(id|profiles)\//i.test(v)) return true;
    return false;
  }

  async function resolveFaceitPlayerFromSteam(steamInput) {
    let cleanInput = String(steamInput).trim();

    // 1. Если ввели просто короткое число (AccountID), переводим в 17-значный SteamID64
    if (/^\d{1,10}$/.test(cleanInput)) {
      cleanInput = (BigInt(cleanInput) + STEAMID64_BASE).toString();
    }

    // 2. Если это ссылка /profiles/ЧИСЛО
    const profileMatch = cleanInput.match(/steamcommunity\.com\/profiles\/(\d+)\/?$/i);
    if (profileMatch) {
      const id = profileMatch[1];
      if (id.length <= 10) {
        // Автоматически конвертируем короткий ID в SteamID64 и обновляем ссылку
        const steam64 = (BigInt(id) + STEAMID64_BASE).toString();
        cleanInput = `https://steamcommunity.com{steam64}`;
      } else if (id.length !== 17) {
        throw new Error(`Invalid SteamID64: "${id}" must be 17 digits long.`);
      }
    }

    const url = `/api/faceit-by-steam?steam=${encodeURIComponent(cleanInput)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await r.json().catch(() => null);
    
    if (!r.ok) {
      throw new Error(data?.error || `Steam resolve failed (${r.status})`);
    }
    if (!data?.player) {
      throw new Error("Faceit player not found for this Steam account");
    }
    return data.player;
  }

  function checkFaceitAPI() {
    if (typeof window.FaceitAPI === "undefined") {
      console.error("FaceitAPI не загружен!");
      return false;
    }
    return true;
  }

  window.AppPlayerResolve = {
    isSteamInput,
    resolveFaceitPlayerFromSteam,
    checkFaceitAPI,
  };
})();
