/**
 * Browser config compatibility layer.
 * FACEIT auth lives on the serverless API; the client never needs a real key.
 */
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
