(function () {
  // Список метрик и их контента для второго экрана
  // Вы можете легко дополнить или отредактировать поля 'title' и 'content' для каждой метрики.
  const METRICS_DETAILS = {
    Firepower: {
      title: "Firepower",
      content: `
    <p>Play <a href='https://steamcommunity.com/sharedfiles/filedetails/?id=3070244462' target='_blank' rel='noopener noreferrer'>Aim Botz</a> for 15-20 minutes every day before playing.</p>
    <p>Get 500 kills on DeathMatch after a productive session.</p>
    <p>Keep your crosshair at head level.</p>
  `,
    },
    Entrying: {
      title: "Entrying",
      content:
        "<p>Здесь вы можете настраивать информацию и советы по улучшению <b>Entrying</b>.</p>",
    },
    Trading: {
      title: "Trading",
      content:
        "<p>Здесь вы можете настраивать информацию и советы по улучшению <b>Trading</b>.</p>",
    },
    Opening: {
      title: "Opening",
      content:
        "<p>Здесь вы можете настраивать информацию и советы по улучшению <b>Opening</b>.</p>",
    },
    Clutching: {
      title: "Clutching",
      content:
        "<p>Здесь вы можете настраивать информацию и советы по улучшению <b>Clutching</b>.</p>",
    },
    Sniping: {
      title: "Sniping",
      content:
        "<p>Здесь вы можете настраивать информацию и советы по улучшению <b>Sniping</b>.</p>",
    },
    Utility: {
      title: "Utility",
      content:
        "<p>Здесь вы можете настраивать информацию и советы по улучшению <b>Utility</b>.</p>",
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
