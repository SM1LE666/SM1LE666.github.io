(function () {
  function initializeEventListeners() {
    const langButtons = document.querySelectorAll(".lang-btn");
    langButtons.forEach((btn) => {
      btn.removeAttribute("onclick");
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const selectedLang = btn.dataset.lang;
        window.switchLanguage(selectedLang);
      });
    });

    const supportBtn = document.querySelector(".support-btn");
    if (supportBtn) {
      supportBtn.removeAttribute("onclick");
      const newSupportBtn = supportBtn.cloneNode(true);
      supportBtn.parentNode.replaceChild(newSupportBtn, supportBtn);

      document.querySelector(".support-btn").addEventListener("click", (e) => {
        e.preventDefault();
        window.openSupportModal();
      });
    }

    const contactBtn = document.querySelector(".contact-btn");
    if (contactBtn) {
      contactBtn.removeAttribute("onclick");
      const newContactBtn = contactBtn.cloneNode(true);
      contactBtn.parentNode.replaceChild(newContactBtn, contactBtn);

      document.querySelector(".contact-btn").addEventListener("click", (e) => {
        e.preventDefault();
        window.openContactModal();
      });
    }

    const reactionBtn = document.getElementById("reactionTestBtn");
    if (reactionBtn) {
      reactionBtn.removeAttribute("onclick");
      const newReactionBtn = reactionBtn.cloneNode(true);
      reactionBtn.parentNode.replaceChild(newReactionBtn, reactionBtn);
      document
        .getElementById("reactionTestBtn")
        .addEventListener("click", (e) => {
          e.preventDefault();
          window.openReactionTestModal();
        });
    }

    const nicknameInput = document.getElementById("nickname");
    if (nicknameInput) {
      nicknameInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          window.searchPlayer(null, true);
        }
      });

      nicknameInput.addEventListener("input", (event) => {
        if (!event.target.value.trim() && window.currentPlayerProfile) {
          window.clearPlayerProfile();
        }
      });
    }

    const searchButton = document.getElementById("searchButton");
    if (searchButton) {
      searchButton.removeAttribute("onclick");
      const newSearchBtn = searchButton.cloneNode(true);
      searchButton.parentNode.replaceChild(newSearchBtn, searchButton);

      document.getElementById("searchButton").addEventListener("click", (e) => {
        e.preventDefault();
        const nicknameValue = document
          .getElementById("nickname")
          ?.value?.trim();
        window.trackEvent("analyze_click", { input: nicknameValue || null });
        window.searchPlayer(null, true);
      });
    }

    document.querySelectorAll(".close").forEach((closeBtn) => {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.closeAllModals();
      });
    });

    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
      contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        window.sendMessage(e);
      });
    }

    document.addEventListener("click", (event) => {
      const modals = document.querySelectorAll(".modal");
      modals.forEach((modal) => {
        if (event.target === modal) {
          window.closeAllModals();
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        window.closeAllModals();
      }
    });

    initializeProPlayerCards();
  }

  function initializeProPlayerCards() {
    const proPlayers = {
      donk: "https://steamcommunity.com/id/donkgojo",
      m0NESY: "https://steamcommunity.com/id/m0NESY-",
      s1mple: "https://steamcommunity.com/id/officials1mple",
      ZywOo: "https://steamcommunity.com/profiles/76561198113666193",
    };

    const proCards = document.querySelectorAll(".pro-card");

    proCards.forEach((card) => {
      const playerName = card.querySelector(".pro-name")?.textContent.trim();

      if (playerName && proPlayers[playerName]) {
        card.style.cursor = "pointer";

        card.addEventListener("click", async () => {
          const steamUrl = proPlayers[playerName];
          const nicknameInput = document.getElementById("nickname");

          if (nicknameInput) {
            nicknameInput.value = steamUrl;
            window.scrollTo({ top: 0, behavior: "smooth" });

            try {
              await new Promise((resolve) => setTimeout(resolve, 300));
              await window.analyzePlayer();
              const faceitNick =
                window.currentPlayerData?.nickname || playerName;
              window.updateUrlForPlayer(faceitNick);
            } catch (error) {
              console.error("Pro-card: ошибка при анализе игрока:", error);
            }
          }
        });

        card.addEventListener("mouseenter", () => {
          card.style.transform = "translateY(-5px)";
        });

        card.addEventListener("mouseleave", () => {
          card.style.transform = "translateY(0)";
        });
      }
    });
  }

  window.AppUIEvents = {
    initializeEventListeners,
    initializeProPlayerCards,
  };
})();
