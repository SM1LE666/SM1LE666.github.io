(function () {
  const COOKIE_CONSENT_KEY = "fa_cookie_consent_v1";

  function getAnonymousId() {
    const key = "fa_anonymous_id";
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const id =
        crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, id);
      return id;
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  function getSessionId() {
    const key = "fa_session_id";
    try {
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;
      const id =
        crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(key, id);
      return id;
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  function getLastAnalyzedPlayer() {
    try {
      const nickname = window.currentPlayerData?.nickname || null;
      const playerId = window.currentPlayerData?.player_id || null;
      return { nickname, playerId };
    } catch {
      return { nickname: null, playerId: null };
    }
  }

  function getCookieConsent() {
    try {
      const v = localStorage.getItem(COOKIE_CONSENT_KEY);
      return v === "accepted" || v === "rejected" ? v : null;
    } catch {
      return null;
    }
  }

  function setCookieConsent(value) {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch {
      // ignore
    }
  }

  function isAnalyticsAllowed() {
    return getCookieConsent() === "accepted";
  }

  function openCookieModal() {
    const modal = document.getElementById("cookieModal");
    if (!modal) return;
    modal.style.display = "block";
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeCookieModal() {
    const modal = document.getElementById("cookieModal");
    if (!modal) return;
    modal.style.display = "none";
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  function updateCookieFabVisibility() {
    const fab = document.getElementById("cookieFab");
    if (!fab) return;
    const consent = getCookieConsent();
    fab.style.display = consent === "accepted" ? "none" : "inline-flex";
  }

  function trackEvent(eventName, props = {}) {
    try {
      if (!isAnalyticsAllowed()) return;

      const last = getLastAnalyzedPlayer();
      const payload = {
        anonymousId: getAnonymousId(),
        sessionId: getSessionId(),
        eventName,
        eventSource: "web",
        referrer: document.referrer || "",
        props: {
          lang: document.documentElement.lang || "",
          timezone: (() => {
            try {
              return Intl.DateTimeFormat().resolvedOptions().timeZone;
            } catch {
              return "";
            }
          })(),
          screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
          url: location.href,
          analyzedNickname: last.nickname,
          analyzedPlayerId: last.playerId,
          ...props,
        },
      };

      const body = JSON.stringify(payload);

      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/track", blob);
        return;
      }

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore tracking errors
    }
  }

  function installGlobalClickTracking() {
    document.addEventListener(
      "click",
      (e) => {
        const t = e.target;
        if (!t || !(t instanceof Element)) return;

        const el =
          t.closest("#searchButton") ||
          t.closest(".support-btn") ||
          t.closest(".contact-btn") ||
          t.closest("#reactionTestBtn") ||
          t.closest(".sidebar-item") ||
          t.closest(".drawer-item") ||
          t.closest(".show-more-btn") ||
          t.closest(".submit-btn");

        if (!el) return;

        const label =
          (el.getAttribute("data-view") &&
            `view:${el.getAttribute("data-view")}`) ||
          el.getAttribute("data-action") ||
          el.id ||
          el.className ||
          el.tagName;

        trackEvent("click", { label });
      },
      { passive: true },
    );
  }

  function init() {
    try {
      trackEvent("page_view", { title: document.title });
    } catch {
      // ignore
    }
    installGlobalClickTracking();
  }

  const AppAnalytics = {
    getAnonymousId,
    getSessionId,
    getLastAnalyzedPlayer,
    getCookieConsent,
    setCookieConsent,
    isAnalyticsAllowed,
    openCookieModal,
    closeCookieModal,
    updateCookieFabVisibility,
    trackEvent,
    init,
  };

  window.AppAnalytics = AppAnalytics;
  window.getAnonymousId = getAnonymousId;
  window.getSessionId = getSessionId;
  window.getLastAnalyzedPlayer = getLastAnalyzedPlayer;
  window.getCookieConsent = getCookieConsent;
  window.setCookieConsent = setCookieConsent;
  window.isAnalyticsAllowed = isAnalyticsAllowed;
  window.openCookieModal = openCookieModal;
  window.closeCookieModal = closeCookieModal;
  window.updateCookieFabVisibility = updateCookieFabVisibility;
  window.trackEvent = trackEvent;
  AppAnalytics.init();
})();
