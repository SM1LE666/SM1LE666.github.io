class Config {
  constructor() {
    this.loaded = true;
  }

  async loadConfig() {
    this.loaded = true;
    return true;
  }
}

window.Config = new Config();
