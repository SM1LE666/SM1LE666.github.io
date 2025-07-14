/**
 * Configuration loader
 * Загружает конфигурацию из .env файла
 */

class Config {
  constructor() {
    this.apiKey = null;
    this.loaded = false;
  }

  async loadConfig() {
    try {
      const response = await fetch(".env");
      if (!response.ok) {
        throw new Error("Не удалось загрузить файл конфигурации");
      }

      const envText = await response.text();
      const lines = envText.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const [key, value] = trimmedLine.split("=");
          if (key === "FACEIT_API_KEY") {
            this.apiKey = value;
            break;
          }
        }
      }

      if (!this.apiKey) {
        throw new Error("API ключ не найден в конфигурации");
      }

      this.loaded = true;
      console.log("Конфигурация успешно загружена");
      return true;
    } catch (error) {
      console.error("Ошибка загрузки конфигурации:", error);
      // Fallback на случай проблем с .env файлом
      this.apiKey = prompt("Введите ваш FACEIT API ключ:");
      this.loaded = !!this.apiKey;
      return this.loaded;
    }
  }

  getApiKey() {
    if (!this.loaded) {
      throw new Error(
        "Конфигурация не загружена. Вызовите loadConfig() сначала."
      );
    }
    return this.apiKey;
  }
}

// Создаем глобальный экземпляр конфигурации
window.Config = new Config();
