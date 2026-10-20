const appState = window.AppState || {
  playerStats: null,
  isInitialized: false,
  currentPlayerProfile: null,
  sidebarManager: null,
  lastHandledPath: null,
};

let playerStats = appState.playerStats ?? null;
let isInitialized = appState.isInitialized ?? false;
let currentPlayerProfile = appState.currentPlayerProfile ?? null;
let sidebarManager = appState.sidebarManager ?? null;
let lastHandledPath = appState.lastHandledPath ?? null;
const SidebarManager = window.SidebarManager || null;

function syncStateFromApp() {
  appState.playerStats = playerStats;
  appState.isInitialized = isInitialized;
  appState.currentPlayerProfile = currentPlayerProfile;
  appState.sidebarManager = sidebarManager;
  appState.lastHandledPath = lastHandledPath;
}

// CSS профиля игрока подгружается отдельно (на главной он не нужен)
const PROFILE_STYLES_URL = "/app/styles.profile.css?v=1.3";
let profileStylesPromise = null;

function loadProfileStyles() {
  if (profileStylesPromise) return profileStylesPromise;
  profileStylesPromise = new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = PROFILE_STYLES_URL;
    link.onload = () => resolve(true);
    link.onerror = () => resolve(false);
    document.head.appendChild(link);
  });
  return profileStylesPromise;
}

// ---------- Выбор игрока, когда ник совпадает у нескольких людей ----------
const PICKER_MIN_QUERY = 3; // с какой длины ника искать похожих
const PICKER_LIMIT = 20; // сколько игроков показывать максимум
// true: если среди найденных есть точное совпадение ника, сразу открывать его профиль
const PICKER_AUTO_OPEN_EXACT_MATCH = false;
let pickerRequestId = 0;

function looksLikeNickname(value) {
  if (!value || value.length < PICKER_MIN_QUERY) return false;
  if (/[/:\\]/.test(value)) return false; // ссылка на профиль
  if (window.AppPlayerResolve?.isSteamInput(value)) return false; // Steam ID / ссылка
  return true;
}

async function fetchPlayerCandidates(nickname) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      `/api/search?nickname=${encodeURIComponent(nickname)}&limit=${PICKER_LIMIT}`,
      { headers: { Accept: "application/json" }, signal: controller.signal },
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.items)
      ? data.items.filter((p) => p && p.nickname)
      : [];
  } catch {
    return []; // поиск недоступен: работаем как раньше, по точному нику
  } finally {
    clearTimeout(timer);
  }
}

// Точное совпадение, затем ники, начинающиеся с запроса, затем остальные; при равенстве выше уровень
function rankCandidates(items, query) {
  const q = query.toLowerCase();
  const score = (p) => {
    const n = p.nickname.toLowerCase();
    return n === q ? 0 : n.startsWith(q) ? 1 : 2;
  };
  return [...items].sort(
    (a, b) =>
      score(a) - score(b) || (Number(b.level) || 0) - (Number(a.level) || 0),
  );
}

function buildPickerCard(player, index, isExact) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "picker-card";
  card.style.setProperty("--i", String(index));
  card.setAttribute("aria-label", `Analyze ${player.nickname}`);

  if (isExact) {
    const badge = document.createElement("span");
    badge.className = "picker-badge";
    badge.textContent = "Exact";
    card.appendChild(badge);
  }

  const avatar = document.createElement("img");
  avatar.className = "picker-avatar";
  avatar.alt = "";
  avatar.loading = "lazy";
  avatar.decoding = "async";
  avatar.src = player.avatar || "/assets/favicon.svg";
  avatar.onerror = () => {
    avatar.onerror = null;
    avatar.src = "/assets/favicon.svg";
  };

  const nick = document.createElement("span");
  nick.className = "picker-nick";
  nick.textContent = player.nickname;
  nick.title = player.nickname;

  const level = document.createElement("div");
  level.className = "picker-level";
  const levelNumber = Number(player.level);
  if (levelNumber >= 1 && levelNumber <= 10) {
    const icon = document.createElement("img");
    icon.src = `/images/levels/lvl${levelNumber}.svg`;
    icon.alt = "";
    icon.width = 30;
    icon.height = 30;
    const label = document.createElement("span");
    label.textContent = `Level ${levelNumber}`;
    level.append(icon, label);
  } else {
    level.textContent = "No level";
  }

  card.append(avatar, nick, level);
  card.addEventListener("click", () => selectPickerPlayer(player.nickname));
  return card;
}

function showPlayerPicker(items, query) {
  const section = document.getElementById("playerPicker");
  const list = document.getElementById("playerPickerList");
  if (!section || !list) return false;

  const lowerQuery = query.toLowerCase();
  list.replaceChildren(
    ...items.map((player, index) =>
      buildPickerCard(player, index, player.nickname.toLowerCase() === lowerQuery),
    ),
  );

  const title = document.getElementById("playerPickerTitle");
  if (title) title.textContent = `${items.length} players found`;
  const hint = document.getElementById("playerPickerHint");
  if (hint) {
    hint.textContent =
      `Several players match "${query}". Choose who you want to analyze.` +
      (items.length >= PICKER_LIMIT
        ? ` Showing the first ${PICKER_LIMIT}, type more of the nickname to narrow it down.`
        : "");
  }

  section.hidden = false;
  document.body.classList.add("picker-open");
  section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return true;
}

function hidePlayerPicker() {
  const section = document.getElementById("playerPicker");
  if (section) section.hidden = true;
  document.body.classList.remove("picker-open");
}

function selectPickerPlayer(nickname) {
  hidePlayerPicker();
  const nicknameInput = document.getElementById("nickname");
  if (nicknameInput) nicknameInput.value = nickname;
  window.trackEvent?.("picker_select", { nickname });
  searchPlayer(nickname, true);
}

async function searchPlayerInteractive() {
  const nicknameInput = document.getElementById("nickname");
  const nickname = nicknameInput?.value?.trim() || "";
  hidePlayerPicker();

  if (!looksLikeNickname(nickname)) return searchPlayer(null, true);

  const searchButton = document.getElementById("searchButton");
  const requestId = ++pickerRequestId;
  if (searchButton) {
    searchButton.disabled = true;
    searchButton.setAttribute("aria-busy", "true");
  }

  let candidates = [];
  try {
    candidates = await fetchPlayerCandidates(nickname);
  } finally {
    if (searchButton) {
      searchButton.disabled = false;
      searchButton.removeAttribute("aria-busy");
    }
  }
  if (requestId !== pickerRequestId) return; // запущен более новый поиск

  window.trackEvent?.("search_candidates", {
    query: nickname,
    count: candidates.length,
  });

  if (candidates.length === 0) return searchPlayer(null, true);

  const ranked = rankCandidates(candidates, nickname);
  if (ranked.length === 1) return searchPlayer(ranked[0].nickname, true);

  const exact = ranked.find(
    (p) => p.nickname.toLowerCase() === nickname.toLowerCase(),
  );
  if (exact && PICKER_AUTO_OPEN_EXACT_MATCH) {
    return searchPlayer(exact.nickname, true);
  }

  if (!showPlayerPicker(ranked, nickname)) return searchPlayer(null, true);
}

function updateUrlForPlayer(nickname) {
  const path = window.AppRouter
    ? window.AppRouter.buildPlayerUrl(nickname)
    : nickname
      ? `/player/${encodeURIComponent(nickname)}`
      : "/";
  const title = nickname ? `FACEIT Analyze - ${nickname}` : "FACEIT Analyze";

  if (window.location.pathname !== path) {
    history.pushState({ nickname }, title, path);
    lastHandledPath = path;
    syncStateFromApp();
  }
  document.title = title;
}

async function handleUrlChange() {
  const currentPath = window.location.pathname;
  if (lastHandledPath === currentPath) return;

  lastHandledPath = currentPath;
  syncStateFromApp();

  const route = window.AppRouter
    ? window.AppRouter.resolvePath(currentPath)
    : null;

  if (route?.type === "modal") {
    openModalByRoute(route.modalId, false);
    return;
  } else {
    closeModalRoute(false);
  }

  const nickname = route?.type === "player" ? route.nickname : null;
  const nicknameInput = document.getElementById("nickname");

  if (nickname) {
    if (nicknameInput) nicknameInput.value = nickname;
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      await searchPlayer(nickname, false);
    } catch (error) {
      console.error("Ошибка при загрузке профиля:", error);
      alert(`Ошибка: ${error.message}`);
    }
    return;
  }
  if (nicknameInput?.value) nicknameInput.value = "";
  goBackToMain(false);
}

async function init() {
  if (isInitialized) return;

  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname);
  }

  if (!sidebarManager && (SidebarManager || window.SidebarManager)) {
    const ManagerClass = SidebarManager || window.SidebarManager;
    sidebarManager = new ManagerClass();
    window.sidebarManager = sidebarManager;
  }

  // Профиль открывается сразу по ссылке /player/... или после фокуса на поиске
  if (/^\/player\//i.test(window.location.pathname)) loadProfileStyles();
  document
    .getElementById("nickname")
    ?.addEventListener("focus", loadProfileStyles, { once: true });

  document
    .getElementById("playerPickerClose")
    ?.addEventListener("click", hidePlayerPicker);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hidePlayerPicker();
  });

  window.AppUIEvents.initializeEventListeners();
  window.addEventListener(
    "resize",
    debounce(() => sidebarManager?.handleResize(), 150),
  );
  window.addEventListener("popstate", handleUrlChange);

  try {
    await window.Config.loadConfig();
  } catch (error) {
    console.error("Ошибка при загрузке конфигурации:", error);
  }

  window.AppPlayerResolve.checkFaceitAPI();

  isInitialized = true;
  syncStateFromApp();
  await handleUrlChange();
}

function parseAnalyzeError(error) {
  let errorText = "Player not found or request error occurred.";
  try {
    const parsedError = JSON.parse(error.message);
    if (parsedError.errors && parsedError.errors[0]?.code === "err_nf0") {
      return "Player not found. Please check the input or try again later.";
    }
  } catch {
    if (error.message) errorText = error.message;
  }
  return errorText;
}

function showAnalyzeError(errorText, output) {
  let banner = document.getElementById("custom-error-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "custom-error-banner";
    document.body.appendChild(banner);
  }

  banner.textContent = errorText;
  banner.style.opacity = "1";

  if (window.errorTimeout) clearTimeout(window.errorTimeout);
  window.errorTimeout = setTimeout(() => {
    banner.style.opacity = "0";
    setTimeout(() => banner.remove(), 300);
  }, 2000);

  if (output) {
    output.style.display = "block";
    output.textContent = errorText;
    setTimeout(() => {
      output.style.display = "none";
    }, 2000);
  }
}

function showPlayerResults() {
  hidePlayerPicker();
  const resultsSection = document.getElementById("results");
  const proGrid = document.querySelector(".pro-grid");
  if (resultsSection) resultsSection.style.display = "block";
  if (proGrid) proGrid.style.display = "none";
  document.body.classList.add("profile-active");
}

async function analyzePlayer() {
  const nickname = document.getElementById("nickname")?.value?.trim();
  if (!nickname) {
    alert("Please enter a nickname or profile URL.");
    return;
  }

  const output = document.getElementById("output");
  const playerStatsContainer = document.getElementById("playerStats");
  const faceitService = window.FaceitAPI;

  const profileStylesReady = loadProfileStyles();

  if (!playerStats) playerStats = playerStatsContainer;
  if (output) output.textContent = `Getting data for ${nickname}...`;

  try {
    if (!window.Config.loaded) await window.Config.loadConfig();
    if (!window.FaceitAPI) throw new Error("FaceitAPI не загружена");

    let playerData;
    if (window.AppPlayerResolve.isSteamInput(nickname)) {
      window.trackEvent("analyze_input_steam", { input: nickname });
      playerData =
        await window.AppPlayerResolve.resolveFaceitPlayerFromSteam(nickname);
    } else {
      playerData = await faceitService.getPlayerData(nickname);
    }

    window.currentPlayerData = playerData;
    window.trackEvent("analyze_player_resolved", {
      searched: nickname,
      resolvedNickname: playerData?.nickname || null,
      resolvedPlayerId: playerData?.player_id || null,
    });

    if (output) {
      output.textContent = `Getting CS:2 statistics for ${playerData.nickname}...`;
    }

    const gameId = "cs2";
    const statsData = await faceitService.getStatsData(
      playerData.player_id,
      gameId,
    );
    const currentElo = await faceitService.getCurrentElo(
      playerData.player_id,
      gameId,
      playerData.games?.[gameId]?.faceit_elo || 0,
    );
    const countryName = await faceitService.getCountryName(playerData.country);
    const lifetime = statsData.lifetime || {};
    const segments = statsData.segments || [];
    const avgStats = faceitService.calculateAvgStats(
      lifetime,
      segments,
      gameId,
    );
    const mapAnalysis = faceitService.analyzeMaps(segments, gameId);

    currentPlayerProfile = {
      playerData,
      statsData,
      currentElo,
      countryName,
      avgStats,
      mapAnalysis,
    };
    window.currentPlayerProfile = currentPlayerProfile;
    syncStateFromApp();

    window.trackEvent("analyze_success", {
      playerNickname: playerData?.nickname || null,
      playerId: playerData?.player_id || null,
      gameId,
    });

    if (output) output.style.display = "none";

    // Стили профиля должны быть загружены до отрисовки карточки
    await profileStylesReady;

    playerStatsContainer.innerHTML = window.AppRendering.renderPlayerCard(
      playerData,
      countryName,
      currentElo,
      avgStats,
      lifetime,
    );
    playerStatsContainer.style.display = "block";

    const statsContainer =
      playerStatsContainer.querySelector(".stats-container");

    showPlayerResults();
    if (statsContainer) {
      window.AppRendering.renderOverviewStats(statsContainer);
    }

    requestAnimationFrame(() => {
      if (sidebarManager) {
        if (statsContainer) {
          sidebarManager.originalStatsHTML = statsContainer.innerHTML;
        }
        sidebarManager.showForPlayerProfile();
      }
    });
  } catch (error) {
    console.error("Ошибка при получении данных игрока:", error);
    window.trackEvent("analyze_error", {
      searched: nickname,
      message: String(error?.message || error),
    });
    showAnalyzeError(parseAnalyzeError(error), output);
  }
}

async function searchPlayer(nicknameParam = null, updateUrl = true) {
  const nicknameInput = document.getElementById("nickname");
  const nickname = nicknameParam
    ? nicknameParam.trim()
    : nicknameInput?.value?.trim();

  if (!nickname) return;
  if (nicknameParam && nicknameInput) nicknameInput.value = nickname;

  await analyzePlayer();

  if (updateUrl) {
    updateUrlForPlayer(window.currentPlayerData?.nickname || nickname);
  }
}

function goBackToMain(updateUrl = true) {
  hidePlayerPicker();
  const output = document.getElementById("output");
  const playerStatsContainer = document.getElementById("playerStats");
  const resultsSection = document.getElementById("results");
  const proGrid = document.querySelector(".pro-grid");
  const searchSection = document.getElementById("search");
  const nicknameInput = document.getElementById("nickname");

  if (playerStatsContainer) {
    playerStatsContainer.innerHTML = "";
    playerStatsContainer.style.display = "none";
  }
  if (resultsSection) resultsSection.style.display = "none";
  if (searchSection) searchSection.style.display = "block";
  if (output) {
    output.style.display = "none";
    output.textContent = "";
  }
  if (nicknameInput) nicknameInput.value = "";

  document.body.classList.remove("profile-active");
  sidebarManager?.hideForPlayerProfile();

  currentPlayerProfile = null;
  window.currentPlayerProfile = null;
  window.currentPlayerData = null;
  syncStateFromApp();

  // scrollTo требует актуальной раскладки, а DOM только что изменён (display, class),
  // поэтому прямой вызов вызывает принудительную компоновку (forced reflow).
  // Двойной rAF: первый кадр сам пересчитывает layout, второй уже скроллит по чистой раскладке.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  if (updateUrl) updateUrlForPlayer(null);
}

const MODAL_ROUTE_MAP = {
  "reaction-test": "reactionTestModal",
  contact: "contactModal",
  support: "supportModal",
  "aim-trainer": "aimTrainerModal",
};

function openModalByRoute(modalRoute, updateUrl = true) {
  const modalId = MODAL_ROUTE_MAP[modalRoute];
  if (!modalId) return;

  Object.values(MODAL_ROUTE_MAP).forEach((id) => {
    const el = document.getElementById(id);
    if (el && id !== modalId) {
      el.style.display = "none";
      el.classList.remove("show");
    }
  });

  const modalElement = document.getElementById(modalId);
  if (modalElement) {
    modalElement.style.display = "flex";
    modalElement.classList.add("show");
  }

  if (updateUrl) {
    const targetPath = `/${modalRoute}`;
    if (window.location.pathname !== targetPath) {
      history.pushState(
        { modal: modalRoute, previousPath: window.location.pathname },
        "",
        targetPath,
      );
      lastHandledPath = targetPath;
      syncStateFromApp();
    }
  }
}

function closeModalRoute(updateUrl = true) {
  Object.values(MODAL_ROUTE_MAP).forEach((modalId) => {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.style.display = "none";
      modalElement.classList.remove("show");
    }
  });

  if (updateUrl) {
    const fallbackPath = window.currentPlayerData?.nickname
      ? `/player/${encodeURIComponent(window.currentPlayerData.nickname)}`
      : "/";

    if (window.location.pathname !== fallbackPath) {
      history.pushState(null, "", fallbackPath);
      lastHandledPath = fallbackPath;
      syncStateFromApp();
    }
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

window.updateUrlForPlayer = updateUrlForPlayer;
window.loadProfileStyles = loadProfileStyles;
window.searchPlayerInteractive = searchPlayerInteractive;
window.analyzePlayer = analyzePlayer;
window.searchPlayer = searchPlayer;
window.goBackToMain = goBackToMain;
window.clearPlayerProfile = () => goBackToMain(true);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
