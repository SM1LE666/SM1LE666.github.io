(function () {
  // ───────────── Хелперы для ссылок ─────────────
  const STEAM = "https://steamcommunity.com";
  // translate="no": автоперевод браузера не должен менять названия карт и сервисов
  const NEW_TAB = 'target="_blank" rel="noopener noreferrer" translate="no"';

  // Карта из Steam Workshop по ID
  const workshopMap = (id, label) =>
    `<a href="${STEAM}/sharedfiles/filedetails/?id=${id}" ${NEW_TAB}>${label}</a>`;

  // Поиск по Steam Workshop (CS2 = appid 730) — не ломается, если карту удалят
  const workshopSearch = (text, label) =>
    `<a href="${STEAM}/workshop/browse/?appid=730&searchtext=${encodeURIComponent(
      text,
    )}&browsesort=textsearch&section=readytouseitems" ${NEW_TAB}>${label}</a>`;

  const externalLink = (url, label) =>
    `<a href="${url}" ${NEW_TAB}>${label}</a>`;

  // Часто используемые ссылки
  const AIM_BOTZ = workshopMap(3070244462, "Aim Botz");
  const AIM_RUSH = workshopMap(3105821815, "Aim_Rush");
  const FAST_AIM = workshopMap(3070758981, "Fast Aim / Reflex Training");
  const RECOIL_MASTER = workshopMap(3100869952, "Recoil Master");
  const MIRAGE_PREFIRE = workshopMap(3267302800, "Mirage Prefire");
  const YPRAC_HUB = workshopMap(3070715607, "Yprac Hub");
  const MIRAGE_UTILITY = workshopMap(3312981414, "Mirage Utility");
  const PREFIRE_OTHER_MAPS = workshopSearch("Prefire", "prefire maps");
  const UTILITY_OTHER_MAPS = workshopSearch("Utility", "utility maps");
  const CROSSHAIR_GENERATOR = workshopSearch(
    "crashz crosshair generator",
    "crashz' Crosshair Generator",
  );
  const AWP_MAPS = workshopSearch("AWP training", "AWP training maps");
  const RETAKE_MAPS = workshopSearch("Retake", "retake maps");
  const PRACTICE_CONFIG = externalLink(
    "https://csdb.gg/practice-config/",
    "practice config generator",
  );
  const LEETIFY = externalLink("https://leetify.com/", "Leetify");

  // Собираем HTML: короткое вступление + блоки с пронумерованными советами
  const buildContent = (lead, sections) => {
    const intro = `<p class="metric-lead">${lead}</p>`;
    const blocks = sections
      .map(
        ([title, tips]) =>
          `<h4>${title}</h4>` +
          tips.map((tip, i) => `<p>${i + 1}. ${tip}</p>`).join(""),
      )
      .join("");
    return intro + blocks;
  };

  const METRICS_DETAILS = {
    Firepower: {
      title: "Firepower",
      content: buildContent(
        "Firepower shows how much raw damage and how many kills you produce every round. It is built from three things working together: aim, spray control and crosshair placement.",
        [
          [
            "Daily practice",
            [
              `Warm up for 15-20 minutes in ${AIM_BOTZ} before you queue: 100 one-taps with the AK-47, 100 flicks between targets, then 50 kills on moving bots.`,
              `Learn recoil in ${RECOIL_MASTER}. Master the first 7-10 bullets of the AK-47 spray, extend to 15, then turn the guide off and test yourself. Controlling the first 10-15 bullets matters more than a perfect full spray.`,
              `Add dynamic targets for 3-5 minutes with ${AIM_RUSH} or ${FAST_AIM} to train tracking and quick reactions.`,
              "Finish with a Deathmatch session on one weapon. The goal is quality: a few hundred focused kills beat an hour of random shooting.",
            ],
          ],
          [
            "In matches",
            [
              `Keep your crosshair at head level and pre-aim common angles. Pick a crosshair that stays visible against every wall, for example with ${CROSSHAIR_GENERATOR}.`,
              "Stop completely before you shoot (counter-strafe). Tap or burst at long range and save full sprays for close fights.",
              "Don't change your sensitivity every week. Pick one that lets you turn 180 degrees with a comfortable arm sweep, and stick with it.",
            ],
          ],
        ],
      ),
    },
    Entrying: {
      title: "Entrying",
      content: buildContent(
        "Entrying shows how well you take the first fights to open space for your team. Good entry players know the angles in advance and never peek them blind.",
        [
          [
            "Daily practice",
            [
              `Learn pre-aiming and the correct clearing order in ${MIRAGE_PREFIRE}. The same series has more ${PREFIRE_OTHER_MAPS} for the other maps, so start with the one you play most.`,
              `Run the prefire routes in ${YPRAC_HUB}. The basic map is enough to start, but some extras need the separate Yprac Companion app.`,
              `Practice peeks in ${AIM_BOTZ}: shoulder peeks, jiggle peeks and wide swings from behind the practice wall, 50 repetitions at a time.`,
            ],
          ],
          [
            "In matches",
            [
              "Always ask a teammate for a supporting flashbang before you peek, and pre-flash yourself when nobody can help.",
              "Clear the closest angles first and don't jump out in the middle of an open space. Take space together with a teammate who can trade you.",
              "Mix up your entries. If you use the same peek every round, the enemy will pre-aim you.",
              "Practice your entry skills on dedicated duel servers to get used to fighting first.",
            ],
          ],
        ],
      ),
    },
    Trading: {
      title: "Trading",
      content: buildContent(
        "Trading is about punishing the enemy who just killed your teammate. The faster you trade, the less one lost duel hurts the round.",
        [
          [
            "Positioning",
            [
              "Stick close to your entry player so you can trade within 1-2 seconds, but keep a slightly different angle so the same enemy can't hit you both.",
              "Never body-block your teammates during aggressive pushes and never stand directly behind them in a narrow passage.",
              "Hold the exact spot where your teammate will fight. A pre-aimed crosshair on that angle wins the trade before the enemy can reposition.",
            ],
          ],
          [
            "Teamwork",
            [
              "Double-peek angles with your teammate to overwhelm the defender: one clears the wide part, the other covers the close part.",
              "Communicate who goes first and who trades. A simple call like \"I'm trading\" removes the hesitation that costs seconds.",
              `Review your demos with a tool such as ${LEETIFY} to see how many of your teammates' deaths you actually traded, and where you were standing when you didn't.`,
            ],
          ],
        ],
      ),
    },
    Opening: {
      title: "Opening",
      content: buildContent(
        "Opening shows how often you win the first duel of the round. It depends on timing and information far more than on pure aim.",
        [
          [
            "Preparation",
            [
              `Learn the default spawn timings so you arrive at first-contact angles earlier than the enemy. The prefire routes in ${YPRAC_HUB} help you memorize them.`,
              `Learn a few early grenades on ${MIRAGE_UTILITY} (or the ${UTILITY_OTHER_MAPS} for your map) to block or delay aggressive peeks.`,
              `Warm up first-contact angles on the map you are about to play, using ${MIRAGE_PREFIRE} or another ${PREFIRE_OTHER_MAPS} map.`,
            ],
          ],
          [
            "In matches",
            [
              "Take duels where you have an advantage: a flash, a teammate ready to trade or information about the enemy. Avoid risky dry peeks.",
              "On defense, play off-angles and change your position between rounds. Predictable players are the easiest to open on.",
              "After every lost opening duel, check where it happened. If it keeps being the same angle, change how you take it.",
            ],
          ],
        ],
      ),
    },
    Clutching: {
      title: "Clutching",
      content: buildContent(
        "Clutching shows how often you win a round as the last player alive. It is mostly patience, sound and information rather than raw aim.",
        [
          [
            "Mindset",
            [
              "Gather sound cues and information before you move. Walk silently, listen for footsteps and utility, and only then choose your angle.",
              "Play the clock. The bomb explodes after 40 seconds, and a defuse takes 10 seconds (5 with a kit). Use the timer to force defenders to take risks.",
              "Don't rush. Every extra second of silence makes the enemies more nervous and more likely to peek you one by one.",
            ],
          ],
          [
            "Tactics",
            [
              "Isolate your opponents: fight one player at a time, fall back to a position where only one angle sees you, and use a flash or molotov to split them.",
              "Change your position after every kill. The remaining enemies will expect you to be in the same place.",
              `Practice 1vX situations on a private server with bots, using the ${PRACTICE_CONFIG}. CS2 has no built-in retake mode, so try ${RETAKE_MAPS} for realistic scenarios.`,
            ],
          ],
        ],
      ),
    },
    Sniping: {
      title: "Sniping",
      content: buildContent(
        "Sniping shows how effective you are with the AWP and other sniper rifles. It combines quick reactions, calm shots and smart repositioning.",
        [
          [
            "Mechanics",
            [
              `Choose the AWP in ${AIM_BOTZ} (it lets you select any weapon) and practice fast reaction shots and micro-adjustments. ${FAST_AIM} is great for a quick warm-up with moving targets.`,
              `Look for more ${AWP_MAPS} if you want drills made specifically for the AWP.`,
              "Stop before you shoot. The AWP is accurate only when you stand still, so counter-strafe first, then fire. Unscoped shots should be a last resort.",
            ],
          ],
          [
            "In matches",
            [
              "Reposition after every kill or shot to stay unpredictable. The enemy will always look at the spot where you were last.",
              "Don't re-peek the same angle when you play against rifles. Use a shoulder peek to bait a shot, then swing wide.",
              "Hold angles with your crosshair at head level and let the enemy walk into it. Don't dry-peek an angle that your team already controls.",
              "Be careful with the economy: an AWP costs $4750. If you don't get a pick, your team loses a lot more than one round.",
            ],
          ],
        ],
      ),
    },
    Utility: {
      title: "Utility",
      content: buildContent(
        "Utility shows how much impact your grenades have: enemies you blind, flashes that lead to kills for teammates and damage dealt with HE grenades and molotovs.",
        [
          [
            "Learn the lineups",
            [
              `Learn essential grenade lineups on ${MIRAGE_UTILITY} and the ${UTILITY_OTHER_MAPS} for the other maps. Always re-check a lineup on a practice server after a game update, because some smokes can stop working.`,
              `${YPRAC_HUB} includes over a thousand lineups, plus a free-roam mode on official maps.`,
              `On a practice server (see the ${PRACTICE_CONFIG}) use sv_grenade_trajectory_prac_pipreview 1 to see where your grenade will land, and sv_rethrow_last_grenade to repeat a throw until it is perfect.`,
            ],
          ],
          [
            "In matches",
            [
              "Use HE grenades and molotovs early to deal free damage and clear corners or defuse spots.",
              "Always call your pop-flashes before throwing them, so your teammates can swing right as the flash goes off.",
              "Throw flashes so they pop in front of the enemy and not in your teammate's face. Learn a few safe flash spots from behind cover.",
              "Don't die with utility in your hands. A smoke or a flash used at the right moment is worth more than a kill you get at the cost of your whole team's setup.",
            ],
          ],
        ],
      ),
    },
  };

  class MetricsModal {
    constructor() {
      this.overlay = null;
      this.modal = null;
      this.currentView = "list"; // 'list' или 'detail'
      this.selectedMetric = null;

      this.init();
    }

    init() {
      this.createDOM();
      this.bindGlobalEvents();
    }

    // Создаем структуру модального окна один раз в DOM
    createDOM() {
      // Оверлей (темный фон)
      this.overlay = document.createElement("div");
      this.overlay.className = "metrics-modal-overlay";

      // Контейнер модального окна
      this.modal = document.createElement("div");
      this.modal.className = "metrics-modal";

      this.overlay.appendChild(this.modal);
      document.body.appendChild(this.overlay);

      // Закрытие по клику на оверлей (мимо меню)
      this.overlay.addEventListener("click", (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }

    bindGlobalEvents() {
      document.addEventListener("click", (e) => {
        // Только сама кнопка (или её дочерние элементы, например иконка)
        const trigger = e.target.closest(".how-to-improve");
        if (!trigger) return;

        e.preventDefault();
        this.open();
      });
    }

    open() {
      this.showListView();
      this.overlay.classList.add("active");
    }

    close() {
      this.overlay.classList.remove("active");
      this.currentView = "list";
      this.selectedMetric = null;
    }

    // Вид 1: Список всех метрик из metrics-grid
    showListView() {
      this.currentView = "list";

      // Ключи берём из METRICS_DETAILS, а не из текста на странице: при автопереводе
      // (Google Translate) подписи метрик меняются, и поиск по ним ломается
      const listToRender = Object.keys(METRICS_DETAILS);

      this.modal.innerHTML = `
        <div class="metrics-modal-header">
          <h3>How to improve?</h3>
          <button class="metrics-modal-close" aria-label="Close"><i class="fas fa-times"></i></button>
        </div>
        <div class="metrics-modal-body">
          <ul class="metrics-list">
            ${listToRender
              .map(
                (name) => `
              <li class="metrics-list-item" data-metric="${name}">
                <span>${name}</span>
                <i class="fas fa-chevron-right icon-arrow"></i>
              </li>
            `,
              )
              .join("")}
          </ul>
        </div>
      `;

      // Привязываем события для кнопок
      this.modal
        .querySelector(".metrics-modal-close")
        .addEventListener("click", () => this.close());

      const items = this.modal.querySelectorAll(".metrics-list-item");
      items.forEach((item) => {
        item.addEventListener("click", () => {
          const metricName = item.getAttribute("data-metric");
          this.showDetailView(metricName);
        });
      });
    }

    // Вид 2: Детальная информация по выбранной метрике
    showDetailView(metricName) {
      this.currentView = "detail";
      this.selectedMetric = metricName;

      const detailData = METRICS_DETAILS[metricName] || {
        title: metricName,
        content: "<p>Информация для данной метрики пока не настроена.</p>",
      };

      this.modal.innerHTML = `
        <div class="metrics-modal-header">
          <button class="metrics-modal-back" title="Назад к выбору метрик">
            <i class="fas fa-arrow-left"></i>
          </button>
          <h3>${detailData.title}</h3>
          <button class="metrics-modal-close" aria-label="Close"><i class="fas fa-times"></i></button>
        </div>
        <div class="metrics-modal-body metric-detail-content">
          ${detailData.content}
        </div>
      `;

      // Привязываем события для стрелочки и крестика
      this.modal
        .querySelector(".metrics-modal-close")
        .addEventListener("click", () => this.close());
      this.modal
        .querySelector(".metrics-modal-back")
        .addEventListener("click", () => this.showListView());
    }
  }

  // Инициализация после загрузки страницы
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new MetricsModal());
  } else {
    new MetricsModal();
  }
})();
