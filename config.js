/**
 * Configuration loader with encryption support
 * Загружает конфигурацию с поддержкой шифрования API ключа
 */

class Config {
  constructor() {
    this.apiKey = null;
    this.loaded = false;
    this.encrypted = false;
  }

  async loadConfig() {
    try {
      // Проверяем поддержку шифрования
      if (!window.CryptoManager.isSupported()) {
        console.warn(
          "Web Crypto API не поддерживается, используем серверную конфигурацию"
        );
        return await this.loadConfigLegacy();
      }

      // Проверяем зашифрованный ключ в localStorage (опционально)
      const encryptedApiKey = localStorage.getItem("faceit-api-key-encrypted");
      if (encryptedApiKey) {
        // Пытаемся получить пароль, но не блокируем если его нет
        const password = localStorage.getItem("faceit-api-key-password");
        if (password) {
          try {
            this.apiKey = await window.CryptoManager.decryptApiKey(
              encryptedApiKey,
              password
            );
            this.loaded = true;
            this.encrypted = true;
            console.log("API ключ успешно расшифрован из localStorage");
            return true;
          } catch (error) {
            console.warn(
              "Не удалось расшифровать сохраненный ключ, используем серверный"
            );
            localStorage.removeItem("faceit-api-key-encrypted");
            localStorage.removeItem("faceit-api-key-password");
          }
        }
      }

      // Проверяем обычный ключ в localStorage (опционально)
      const savedApiKey = localStorage.getItem("faceit-api-key");
      if (savedApiKey && savedApiKey !== "server-side-key") {
        this.apiKey = savedApiKey;
        this.loaded = true;
        console.log("API ключ загружен из localStorage");
        return true;
      }

      // Пробуем загрузить из config.env (опционально)
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

      // Используем серверную конфигурацию по умолчанию (без запросов к пользователю)
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

  async loadConfigLegacy() {
    // Обычная загрузка без шифрования для старых браузеров
    try {
      const savedApiKey = localStorage.getItem("faceit-api-key");
      if (savedApiKey && savedApiKey !== "server-side-key") {
        this.apiKey = savedApiKey;
        this.loaded = true;
        console.log("API ключ загружен из localStorage");
        return true;
      }

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
        console.log("Файл config.env недоступен");
      }

      // Используем серверную конфигурацию
      this.apiKey = "server-side-key";
      this.loaded = true;
      console.log("Используется серверная конфигурация API ключа");
      return true;
    } catch (error) {
      console.error("Ошибка загрузки конфигурации:", error);
      this.apiKey = "server-side-key";
      this.loaded = true;
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

  isEncrypted() {
    return this.encrypted;
  }

  // Административные функции для продвинутых пользователей (опциональные)
  async changePassword() {
    if (!this.encrypted || !this.loaded) {
      console.warn("API ключ не зашифрован или не загружен");
      return false;
    }

    const newPassword = prompt(
      "Введите новый пароль для API ключа (для продвинутых пользователей):"
    );
    if (newPassword && newPassword.length >= 6) {
      try {
        const encrypted = await window.CryptoManager.encryptApiKey(
          this.apiKey,
          newPassword
        );
        localStorage.setItem("faceit-api-key-encrypted", encrypted);
        localStorage.setItem("faceit-api-key-password", newPassword);
        console.log("Пароль успешно изменен");
        return true;
      } catch (error) {
        console.error("Ошибка изменения пароля:", error);
        return false;
      }
    }
    return false;
  }

  async resetEncryption() {
    if (this.loaded) {
      localStorage.removeItem("faceit-api-key-encrypted");
      localStorage.removeItem("faceit-api-key-password");
      localStorage.removeItem("faceit-api-key");
      this.encrypted = false;
      console.log("Шифрование сброшено");
    }
  }

  // Функция для добавления собственного API ключа (для продвинутых пользователей)
  async addEncryptedKey() {
    if (!window.CryptoManager.isSupported()) {
      console.warn("Web Crypto API не поддерживается в этом браузере");
      return false;
    }

    const apiKey = prompt(
      "Введите ваш FACEIT API ключ (для продвинутых пользователей):"
    );
    if (!apiKey) {
      return false;
    }

    const password = prompt(
      "Создайте пароль для шифрования API ключа (минимум 6 символов):"
    );
    if (!password || password.length < 6) {
      console.warn("Пароль должен содержать минимум 6 символов");
      return false;
    }

    try {
      const encrypted = await window.CryptoManager.encryptApiKey(
        apiKey,
        password
      );
      localStorage.setItem("faceit-api-key-encrypted", encrypted);
      localStorage.setItem("faceit-api-key-password", password);
      this.apiKey = apiKey;
      this.encrypted = true;
      this.loaded = true;
      console.log("API ключ успешно зашифрован и сохранен");
      return true;
    } catch (error) {
      console.error("Ошибка шифрования:", error);
      return false;
    }
  }
}

// Создаем глобальный экземпляр конфигурации
window.Config = new Config();
