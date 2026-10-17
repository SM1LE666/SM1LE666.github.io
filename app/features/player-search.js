(function () {
  "use strict";

  // ───────────── Настройки ─────────────
  const CONFIG = {
    // Эндпоинт бэкенда (см. api/search-players.js)
    searchEndpoint: "/api/search-players",
    // SVG уровней: /images/levels/lvl1.svg ... lvl10.svg
    levelIconPath: (level) => `/images/levels/lvl${level}.svg`,
    fallbackAvatar: "/assets/favicon.svg",
    // CSS секции подгружается лениво, только когда она нужна
    cssUrl: "/app/styles.picker.css?v=1.2",
    maxPlayers: 12,
    requestTimeoutMs: 8000,
    // Сколько профилей одновременно запрашивать, чтобы узнать уровни
    levelConcurrency: 4,
  };

  let stylesPromise = null;
  let sectionEl = null;
  let renderToken = 0;
  const levelCache = new Map(); // nickname(lowercase) -> level (1..10, 0 = нет уровня)

  function loadStyles() {
    if (stylesPromise) return stylesPromise;
    stylesPromise = new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CONFIG.cssUrl;
      link.onload = () => resolve(true);
      link.onerror = () => resolve(false);
      document.head.appendChild(link);
    });
    return stylesPromise;
  }

  // Ник, а не ссылка на профиль / Steam
  function isNicknameQuery(value) {
    const v = String(value || "").trim();
    if (v.length < 2 || v.length > 40) return false;
    if (/[\/\\]/.test(v)) return false;
    if (window.AppPlayerResolve?.isSteamInput?.(v)) return false;
    return true;
  }

  // Точное совпадение выше, затем «начинается с», затем «содержит»,
  // внутри группы — по уровню (больше выше), затем по длине ника
  function sortPlayers(players, query) {
    const q = String(query || "").trim().toLowerCase();
    const rank = (nick) => {
      const n = nick.toLowerCase();
      if (n === q) return 0;
      if (n.startsWith(q)) return 1;
      if (n.includes(q)) return 2;
      return 3;
    };
    return players.slice().sort((a, b) => {
      return (
        rank(a.nickname) - rank(b.nickname) ||
        (b.level || 0) - (a.level || 0) ||
        a.nickname.length - b.nickname.length
      );
    });
  }

  // Ответ FACEIT search/players -> компактный объект для карточки
  // (skill_level в поиске FACEIT всегда "0", поэтому уровень подгружаем отдельно)
  function normalizePlayer(item) {
    return {
      playerId: item?.player_id || "",
      nickname: item?.nickname || "",
      avatar: item?.avatar || "",
      level: null,
    };
  }

  async function findPlayers(query) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
    try {
      const url = `${CONFIG.searchEndpoint}?nickname=${encodeURIComponent(
        String(query).trim(),
      )}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return [];
      const data = await response.json().catch(() => null);
      const list = (Array.isArray(data?.items) ? data.items : []).map(
        normalizePlayer,
      );

      const seen = new Set();
      const unique = list.filter((p) => {
        if (!p?.nickname || seen.has(p.playerId || p.nickname)) return false;
        seen.add(p.playerId || p.nickname);
        return true;
      });
      return sortPlayers(unique, query).slice(0, CONFIG.maxPlayers);
    } catch (error) {
      console.warn("Поиск похожих игроков не удался:", error);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  // ───────────── Отрисовка ─────────────
  function buildAvatar(player) {
    const wrap = document.createElement("span");
    wrap.className = "pp-avatar";

    const img = document.createElement("img");
    img.width = 56;
    img.height = 56;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = player.avatar || CONFIG.fallbackAvatar;
    img.addEventListener("error", () => {
      if (!img.src.endsWith(CONFIG.fallbackAvatar)) {
        img.src = CONFIG.fallbackAvatar;
      }
    });
    wrap.appendChild(img);
    return wrap;
  }

  function buildLevel(player) {
    const wrap = document.createElement("span");
    wrap.className = "pp-level";

    // уровень ещё загружается — показываем заглушку
    if (player.level == null) {
      wrap.classList.add("is-loading");
      wrap.setAttribute("aria-hidden", "true");
      return wrap;
    }

    const level = Number(player.level) || 0;
    wrap.title = level ? `Level ${level}` : "No level";

    const fallback = () => {
      wrap.textContent = "";
      const badge = document.createElement("span");
      badge.className = "pp-level-fallback";
      badge.textContent = level ? `LVL ${level}` : "—";
      wrap.appendChild(badge);
    };

    if (!level) {
      fallback();
      return wrap;
    }

    const img = document.createElement("img");
    img.width = 38;
    img.height = 38;
    img.alt = `Level ${level}`;
    img.loading = "lazy";
    img.decoding = "async";
    img.src = CONFIG.levelIconPath(level);
    img.addEventListener("error", fallback, { once: true });
    wrap.appendChild(img);
    return wrap;
  }

  async function fetchLevel(nickname) {
    const key = nickname.toLowerCase();
    if (levelCache.has(key)) return levelCache.get(key);
    try {
      const data = await window.FaceitAPI.getPlayerData(nickname);
      const n = Number.parseInt(data?.games?.cs2?.skill_level, 10);
      const level = n >= 1 && n <= 10 ? n : 0;
      levelCache.set(key, level);
      return level;
    } catch (error) {
      return 0; // не кэшируем сбой — при следующем поиске попробуем снова
    }
  }

  async function hydrateLevels(players, cards, token) {
    const api = window.FaceitAPI;
    let next = 0;

    const worker = async () => {
      while (next < players.length) {
        const i = next++;
        const level =
          typeof api?.getPlayerData === "function"
            ? await fetchLevel(players[i].nickname)
            : 0;
        if (token !== renderToken) return; // список закрыли или обновили
        players[i].level = level;
        cards[i]?.querySelector(".pp-level")?.replaceWith(buildLevel(players[i]));
      }
    };

    const count = Math.min(CONFIG.levelConcurrency, players.length);
    await Promise.all(Array.from({ length: count }, worker));
  }

  function playerHref(nickname) {
    return window.AppRouter?.buildPlayerUrl
      ? window.AppRouter.buildPlayerUrl(nickname)
      : `/player/${encodeURIComponent(nickname)}`;
  }

  function buildCard(player, index) {
    const li = document.createElement("li");

    const a = document.createElement("a");
    a.className = "pp-card";
    a.href = playerHref(player.nickname);
    a.dataset.nickname = player.nickname;
    a.style.setProperty("--i", String(index));
    a.setAttribute("aria-label", `Open profile ${player.nickname}`);

    const name = document.createElement("span");
    name.className = "pp-name";
    name.setAttribute("translate", "no");
    name.textContent = player.nickname;
    name.title = player.nickname;

    a.append(buildAvatar(player), name, buildLevel(player));
    li.appendChild(a);
    return li;
  }

  function ensureSection() {
    if (sectionEl && document.body.contains(sectionEl)) return sectionEl;

    sectionEl = document.createElement("section");
    sectionEl.id = "playerPicker";
    sectionEl.hidden = true;
    sectionEl.setAttribute("aria-live", "polite");

    sectionEl.addEventListener("click", (event) => {
      if (event.target.closest(".pp-close")) {
        hide();
        return;
      }

      const card = event.target.closest("a.pp-card");
      if (!card) return;
      // Ctrl/Cmd/Shift/средняя кнопка — пусть браузер откроет ссылку сам
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();

      const nickname = card.dataset.nickname;
      window.trackEvent?.("analyze_picker_select", { nickname });
      card.setAttribute("aria-busy", "true");

      const input = document.getElementById("nickname");
      if (input) input.value = nickname;
      Promise.resolve(
        window.searchPlayer?.(nickname, true, { skipPicker: true }),
      ).finally(() => card.removeAttribute("aria-busy"));
    });

    const anchor = document.getElementById("search");
    if (anchor?.parentNode) {
      anchor.parentNode.insertBefore(sectionEl, anchor.nextSibling);
    } else {
      document.querySelector("main")?.prepend(sectionEl);
    }
    return sectionEl;
  }

  async function show(players, query) {
    await loadStyles();
    const section = ensureSection();
    section.textContent = "";

    const head = document.createElement("div");
    head.className = "pp-head";

    const titleBox = document.createElement("div");
    const h2 = document.createElement("h2");
    const icon = document.createElement("i");
    icon.className = "fas fa-search";
    h2.append(icon, " Multiple players found");

    const sub = document.createElement("p");
    sub.className = "pp-sub";
    const q = document.createElement("span");
    q.className = "pp-query";
    q.setAttribute("translate", "no");
    q.textContent = String(query).trim();
    sub.append("Matches for ", q, " — choose the right profile");
    titleBox.append(h2, sub);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "pp-close";
    close.setAttribute("aria-label", "Close");
    const closeIcon = document.createElement("i");
    closeIcon.className = "fas fa-times";
    close.appendChild(closeIcon);

    head.append(titleBox, close);

    const token = ++renderToken;
    players.forEach((p) => {
      const cached = levelCache.get(p.nickname.toLowerCase());
      p.level = cached === undefined ? null : cached;
    });

    const list = document.createElement("ul");
    list.className = "pp-grid";
    players.forEach((p, i) => list.appendChild(buildCard(p, i)));

    section.append(head, list);
    section.hidden = false;
    document.body.classList.add("picker-open");
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const cards = Array.from(list.querySelectorAll("a.pp-card"));
    hydrateLevels(players, cards, token);
  }

  function hide() {
    renderToken++;
    document.body.classList.remove("picker-open");
    if (!sectionEl) return;
    sectionEl.hidden = true;
    sectionEl.textContent = "";
  }

  // Очистили поле — убираем устаревший список
  document.getElementById("nickname")?.addEventListener("input", (event) => {
    if (!event.target.value.trim()) hide();
  });

  window.AppPlayerSearch = {
    isNicknameQuery,
    findPlayers,
    show,
    hide,
    _sortPlayers: sortPlayers,
    _normalizePlayer: normalizePlayer,
  };
})();
