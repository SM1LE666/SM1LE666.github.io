(function () {
  const METRICS_DETAILS = {
    Firepower: {
      title: "Firepower",
      content: `
      <p>1. Play <a href='https://steamcommunity.com/sharedfiles/filedetails/?id=3070244462' target='_blank' rel='noopener noreferrer'>Aim Botz</a> for 15-20 minutes every day before playing.</p>
      <p>2. Get 500 kills on DeathMatch after a productive session.</p>
      <p>3. Keep your crosshair at head level.</p>
    `,
    },
    Entrying: {
      title: "Entrying",
      content: `
      <p>1. Learn pre-aiming and clearing common spots on <a href='https://steamcommunity.com/workshop/browse/?appid=730&browsesort=textsearch&section=readytouseitems&p=1&num_per_page=30&days=7&searchtext=Prefire' target='_blank' rel='noopener noreferrer'>prefire maps.</a></p>
      <p>2. Always ask teammates for supporting flashbangs before yours peeking.</p>
      <p>3. Practice your Entrying skills on special duel's servers</p>
    `,
    },
    Trading: {
      title: "Trading",
      content: `
      <p>1. Stick close to your entry fragger to trade instantly within 1-2 seconds.</p>
      <p>2. Double-peek angles with your teammate to overwhelm the defender.</p>
      <p>3. Never body-block your teammates during aggressive pushes.</p>
    `,
    },
    Opening: {
      title: "Opening",
      content: `
      <p>1. Learn default spawn timings to arrive at first-contact angles faster.</p>
      <p>2. Throw early utility to block or delay aggressive enemy peeks.</p>
      <p>3. Go for high-probability opening duels instead of risky dry peeks.</p>
    `,
    },
    Clutching: {
      title: "Clutching",
      content: `
      
      <p>1. Gather sound cues and information before making your move.</p>
      <p>2. Play the C4 timer and force defenders to to take risks.</p>
      <p>3. Practice your clutch strategies on dedicated servers.</p>
    `,
    },
    Sniping: {
      title: "Sniping",
      content: `
      <p>1. Practice fast reaction shots and micro-adjustments on AWP DeathMatch.</p>
      <p>2. Reposition after every kill to remain unpredictable to the enemy.</p>
      <p>3. Don't repeek the same angle when playing against rifles.</p>
    `,
    },
    Utility: {
      title: "Utility",
      content: `
      <p>1. Learn essential lineup grenades on <a href='https://steamcommunity.com/workshop/browse/?appid=730&browsesort=textsearch&section=readytouseitems&p=1&num_per_page=30&days=7&searchtext=Utility' target='_blank' rel='noopener noreferrer'>Utilities maps.</a></p>
      <p>2. Use HE grenades and Molotovs early to inflict free damage.</p>
      <p>3. Always call your pop-flashes before throwing them for teammates.</p>
    `,
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

    // Делегирование событий на клик по "How to improve?"
    bindGlobalEvents() {
      document.addEventListener("click", (e) => {
        // Проверяем, был ли клик по элементу с текстом или классом
        const trigger = e.target.closest(".metrics-grid p.how-to-improve");
        if (
          trigger &&
          trigger.textContent.trim().toLowerCase().includes("how to improve")
        ) {
          e.preventDefault();
          this.open();
        }
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

      // Получаем текущие метрики со страницы
      const metricLabels = Array.from(
        document.querySelectorAll(".metrics-grid .metric-label"),
      ).map((el) => el.textContent.trim());

      // Если метрики еще не отрендерены, используем ключи по умолчанию
      const listToRender =
        metricLabels.length > 0 ? metricLabels : Object.keys(METRICS_DETAILS);

      this.modal.innerHTML = `
        <div class="metrics-modal-header">
          <h3>How to improve?</h3>
          <button class="metrics-modal-close" aria-label="Close">&times;</button>
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
          <button class="metrics-modal-close" aria-label="Close">&times;</button>
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
