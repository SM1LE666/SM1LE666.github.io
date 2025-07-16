/**
 * Configuration loader - simplified version without encryption
 * Загружает конфигурацию без шифрования
 */

class Config {
  constructor() {
    this.apiKey = null;
    this.loaded = false;
  }

  async loadConfig() {
    try {
      // Проверяем обычный ключ в localStorage
      const savedApiKey = localStorage.getItem("faceit-api-key");
      if (savedApiKey && savedApiKey !== "server-side-key") {
        this.apiKey = savedApiKey;
        this.loaded = true;
        console.log("API ключ загружен из localStorage");
        return true;
      }

      // Пробуем загрузить из config.env (если есть)
      try {
        const response = await fetch("config.env");
        if (response.ok) {
          const envText = await response.text();
          const lines = envText.split("\n");

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith("#")) {
              const [key, value] = trimmedLine.split("=");
              if (
                key === "FACEIT_API_KEY" &&
                value &&
                value !== "server-side-key"
              ) {
                this.apiKey = value;
                break;
              }
            }
          }

          if (this.apiKey) {
            this.loaded = true;
            console.log("Конфигурация успешно загружена из config.env");
            return true;
          }
        }
      } catch (error) {
        console.log(
          "Файл config.env недоступен, используем серверную конфигурацию"
        );
      }

      // Используем серверную конфигурацию по умолчанию
      this.apiKey = "server-side-key"; // Заглушка, реальный ключ на сервере
      this.loaded = true;
      console.log("Используется серверная конфигурация API ключа");
      return true;
    } catch (error) {
      console.error("Ошибка загрузки конфигурации:", error);
      // Используем серверную конфигурацию как fallback
      this.apiKey = "server-side-key";
      this.loaded = true;
      console.log("Fallback: используется серверная конфигурация API ключа");
      return true;
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
