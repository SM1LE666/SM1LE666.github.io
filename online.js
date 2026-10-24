(function (window) {
  "use strict";

  function installPromiseFallback(root) {
    if (root.Promise) return;

    function SimplePromise(executor) {
      var self = this;
      self._state = "pending";
      self._value = null;
      self._handlers = [];

      function settle(state, value) {
        if (self._state !== "pending") return;
        self._state = state;
        self._value = value;
        setTimeout(function () {
          flush(self);
        }, 0);
      }

      function resolve(value) {
        if (value === self) {
          settle("rejected", new TypeError("Promise cannot resolve itself"));
          return;
        }
        try {
          if (value && typeof value.then === "function") {
            value.then(resolve, reject);
            return;
          }
        } catch (error) {
          reject(error);
          return;
        }
        settle("fulfilled", value);
      }

      function reject(reason) {
        settle("rejected", reason);
      }

      try {
        executor(resolve, reject);
      } catch (error) {
        reject(error);
      }
    }

    function flush(promise) {
      var handlers = promise._handlers;
      var handler;
      var callback;
      var result;
      promise._handlers = [];

      while (handlers.length) {
        handler = handlers.shift();
        callback =
          promise._state === "fulfilled"
            ? handler.onFulfilled
            : handler.onRejected;
        if (typeof callback !== "function") {
          if (promise._state === "fulfilled") handler.resolve(promise._value);
          else handler.reject(promise._value);
          continue;
        }
        try {
          result = callback(promise._value);
          handler.resolve(result);
        } catch (error) {
          handler.reject(error);
        }
      }
    }

    SimplePromise.prototype.then = function (onFulfilled, onRejected) {
      var self = this;
      return new SimplePromise(function (resolve, reject) {
        self._handlers.push({
          onFulfilled: onFulfilled,
          onRejected: onRejected,
          resolve: resolve,
          reject: reject,
        });
        if (self._state !== "pending") {
          setTimeout(function () {
            flush(self);
          }, 0);
        }
      });
    };

    SimplePromise.prototype["catch"] = function (onRejected) {
      return this.then(null, onRejected);
    };

    SimplePromise.resolve = function (value) {
      if (value instanceof SimplePromise) return value;
      return new SimplePromise(function (resolve) {
        resolve(value);
      });
    };

    SimplePromise.reject = function (reason) {
      return new SimplePromise(function (resolve, reject) {
        reject(reason);
      });
    };

    SimplePromise.all = function (values) {
      return new SimplePromise(function (resolve, reject) {
        var length = (values && values.length) || 0;
        var results = [];
        var remaining = length;
        var index;

        if (!length) {
          resolve(results);
          return;
        }

        function capture(position) {
          SimplePromise.resolve(values[position]).then(function (value) {
            results[position] = value;
            remaining -= 1;
            if (!remaining) resolve(results);
          }, reject);
        }

        for (index = 0; index < length; index += 1) capture(index);
      });
    };

    root.Promise = SimplePromise;
  }

  installPromiseFallback(window);

  if (window.ShowyMarketingRuntime) return;

  var state = {
    started: false,
    apiBase: "",
    sessionId: "",
    credential: "",
    installationId: "",
    fingerprint: "",
    showyToken: "",
    proActive: false,
    proAccountActive: false,
    proPayload: null,
    inlineSourceBase: "",
    inlineSourceProbeId: 0,
    sourceAdapters: {},
    proExpirationTimer: null,
    card: null,
    pollTimer: null,
    trialPending: false,
    trialRequestId: "",
    postTrialPromptPending: false,
    postTrialPromptShown: false,
    botLinkPending: false,
    directInvoices: {},
    directInvoicePending: {},
    modalController: "",
    modalOpen: false,
    modalRestoreTimer: null,
    modalRestoreVerifyTimer: null,
    modalFocusTimer: null,
    surfaceRetryTimer: null,
    contexts: {},
    components: {},
    componentOptions: {},
    activeMarketingComponent: "",
    sessionGeneration: 0,
    contentOpenSent: false,
    contentCardKey: "",
    contentSessionId: "",
    contentContext: null,
    observedContent: null,
    observedContentComponent: "",
    activityScopeBound: false,
    cardPresented: false,
    options: {},
  };

  function uid(prefix) {
    var random = Math.random().toString(36).slice(2);
    return (
      (prefix || "mkt") + "-" + new Date().getTime().toString(36) + "-" + random
    );
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key) || "";
    } catch (e) {
      try {
        return Lampa.Storage.get(key, "") || "";
      } catch (ignored) {
        return "";
      }
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      try {
        Lampa.Storage.set(key, value);
      } catch (ignored) {}
    }
  }

  function randomInstallationId() {
    var bytes;
    var output = "";
    var i;
    try {
      bytes = new Uint8Array(24);
      window.crypto.getRandomValues(bytes);
      for (i = 0; i < bytes.length; i += 1) {
        output += ("0" + bytes[i].toString(16)).slice(-2);
      }
      return output;
    } catch (e) {
      return (uid("install") + uid("device"))
        .replace(/[^A-Za-z0-9_-]/g, "")
        .slice(0, 96);
    }
  }

  function installationId() {
    var value = String(
      lampaStorageGet("showy_marketing_installation_id") ||
        storageGet("showy_marketing_installation_id") ||
        "",
    );
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(value)) value = randomInstallationId();
    lampaStorageSet("showy_marketing_installation_id", value);
    storageSet("showy_marketing_installation_id", value);
    return value;
  }

  function lampaDeviceId() {
    var value = String(lampaStorageGet("lampac_unic_id") || "");
    if (!/^[A-Za-z0-9_-]{4,128}$/.test(value)) {
      try {
        value = String(Lampa.Utils.uid(8)).toLowerCase();
      } catch (e) {
        value = randomInstallationId().slice(0, 16);
      }
      lampaStorageSet("lampac_unic_id", value);
    }
    return value;
  }

  function deviceFingerprint() {
    var screenWidth = Number((window.screen && window.screen.width) || 0);
    var screenHeight = Number((window.screen && window.screen.height) || 0);
    var dimensions = [screenWidth, screenHeight].sort(function (a, b) {
      return a - b;
    });
    var timezone = "";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (e) {}
    return [
      String(navigator.userAgent || ""),
      String(navigator.platform || ""),
      String(navigator.language || ""),
      String(navigator.hardwareConcurrency || ""),
      String(navigator.deviceMemory || ""),
      dimensions.join("x"),
      String((window.screen && window.screen.colorDepth) || ""),
      timezone,
      lampaDeviceId(),
      clientKind(),
    ]
      .join("|")
      .slice(0, 1024);
  }

  function securityV2() {
    return (
      Number((state.options && state.options.trialSecurityVersion) || 0) >= 2
    );
  }

  function securityIdentityPayload() {
    return {
      installation_id: state.installationId || installationId(),
      fingerprint: state.fingerprint || deviceFingerprint(),
    };
  }

  function pluginTrialExpiration() {
    return String(storageGet("showy_plugin_trial_expiration") || "");
  }

  function clearPluginTrialPrompt() {
    storageSet("showy_plugin_trial_expiration", "");
    storageSet("showy_plugin_trial_prompt_expiration", "");
    storageSet("showy_plugin_trial_prompt_count", "");
    state.postTrialPromptPending = false;
    state.postTrialPromptShown = false;
  }

  function rememberPluginTrial(expiration) {
    expiration = String(expiration || "");
    if (!expiration || isNaN(new Date(expiration).getTime())) return;
    if (pluginTrialExpiration() !== expiration) {
      storageSet("showy_plugin_trial_prompt_expiration", expiration);
      storageSet("showy_plugin_trial_prompt_count", "0");
    }
    storageSet("showy_plugin_trial_expiration", expiration);
  }

  function pluginTrialPromptCount(expiration) {
    var counterExpiration = String(
      storageGet("showy_plugin_trial_prompt_expiration") || "",
    );
    if (counterExpiration !== expiration) {
      storageSet("showy_plugin_trial_prompt_expiration", expiration);
      storageSet("showy_plugin_trial_prompt_count", "0");
      return 0;
    }
    return Math.max(
      parseInt(storageGet("showy_plugin_trial_prompt_count"), 10) || 0,
      0,
    );
  }

  function pluginTrialPromptDue(expiration) {
    expiration = String(expiration || pluginTrialExpiration() || "");
    var expirationAt = new Date(expiration).getTime();
    if (
      !expirationAt ||
      isNaN(expirationAt) ||
      expirationAt > new Date().getTime()
    )
      return false;
    if (
      state.proActive ||
      state.proAccountActive ||
      state.postTrialPromptPending ||
      state.postTrialPromptShown
    )
      return false;
    return pluginTrialPromptCount(expiration) < 5;
  }

  function lampaStorageGet(key) {
    try {
      return Lampa.Storage.get(key, "") || "";
    } catch (e) {
      return "";
    }
  }

  function lampaStorageSet(key, value) {
    try {
      Lampa.Storage.set(key, value);
    } catch (e) {}
  }

  function normalizeBase(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function validHttpBase(value) {
    value = normalizeBase(value);
    return /^https?:\/\/[^\/]+$/i.test(value) ? value : "";
  }

  function rememberComponent(component) {
    component = String(component || "");
    if (component) state.components[component] = true;
  }

  function isFreeComponent(component) {
    component = String(component || "");
    return (
      component === "showy_free" ||
      component === "smotret24_ru" ||
      component === "smotret24_com" ||
      component === "wtch" ||
      component === "smotretk"
    );
  }

  function hasFreeComponent() {
    var component;
    for (component in state.components) {
      if (
        Object.prototype.hasOwnProperty.call(state.components, component) &&
        isFreeComponent(component)
      ) {
        return true;
      }
    }
    return isFreeComponent(state.options.component);
  }

  function inlineSourceCandidates(pro) {
    var configured = pro && pro.source_bases;
    var candidates = [];
    var fallback = state.options.proSourceBases || [
      "http://showypro.com",
      "http://showy.pro",
    ];
    var values = configured && configured.length ? configured : fallback;
    var i;
    for (i = 0; i < values.length; i += 1) {
      var base = validHttpBase(values[i]);
      if (base && candidates.indexOf(base) < 0) candidates.push(base);
    }
    return candidates;
  }

  function setAccessTicketStorage(key, value) {
    storageSet(key, value);
    lampaStorageSet(key, value);
  }

  function clearOfflineAccess() {
    setAccessTicketStorage("showy_access_ticket", "");
    setAccessTicketStorage("showy_access_ticket_expires_at", "");
    storageSet("showy_offline_pro_payload", "");
  }

  function offlinePayload(pro) {
    var expirationAt;
    var ticketExpirationAt;
    var sourceBases;
    var normalized = [];
    var i;
    pro = pro || {};
    expirationAt = new Date(pro.expiration || "").getTime();
    ticketExpirationAt = new Date(pro.access_ticket_expires_at || "").getTime();
    if (!pro.active || pro.access_ticket_format !== "rsa-v1") return null;
    if (String(pro.access_ticket || "").indexOf("st1.") !== 0) return null;
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(pro.showy_token || "")))
      return null;
    if (
      !expirationAt ||
      !ticketExpirationAt ||
      isNaN(expirationAt) ||
      isNaN(ticketExpirationAt)
    )
      return null;
    if (
      expirationAt <= new Date().getTime() ||
      ticketExpirationAt <= new Date().getTime()
    )
      return null;
    if (!/^(trial|paid|grace)$/.test(String(pro.access_kind || "")))
      return null;
    sourceBases = pro.source_bases || [];
    for (i = 0; i < sourceBases.length; i += 1) {
      var base = validHttpBase(sourceBases[i]);
      if (base && normalized.indexOf(base) < 0) normalized.push(base);
    }
    if (!normalized.length) return null;
    return {
      active: true,
      expiration: pro.expiration,
      showy_token: pro.showy_token,
      access_mode: "inline",
      access_kind: pro.access_kind,
      source_bases: normalized,
      access_ticket: pro.access_ticket,
      access_ticket_format: pro.access_ticket_format,
      access_ticket_expires_at: pro.access_ticket_expires_at,
      offline_installation_id: state.installationId || installationId(),
    };
  }

  function cacheOfflineAccess(pro) {
    var cached = offlinePayload(pro);
    if (!cached) return false;
    setAccessTicketStorage("showy_access_ticket", cached.access_ticket);
    setAccessTicketStorage(
      "showy_access_ticket_expires_at",
      cached.access_ticket_expires_at,
    );
    storageSet("showy_offline_pro_payload", JSON.stringify(cached));
    return true;
  }

  function cachedOfflineAccess() {
    var cached;
    var currentToken = String(lampaStorageGet("showy_token") || "");
    try {
      cached = JSON.parse(storageGet("showy_offline_pro_payload") || "{}");
    } catch (e) {
      clearOfflineAccess();
      return null;
    }
    if (
      cached.offline_installation_id &&
      cached.offline_installation_id !==
        (state.installationId || installationId())
    ) {
      clearOfflineAccess();
      return null;
    }
    cached = offlinePayload(cached);
    if (!cached) {
      clearOfflineAccess();
      return null;
    }
    if (!currentToken || currentToken !== String(cached.showy_token || "")) {
      clearOfflineAccess();
      return null;
    }
    return cached;
  }

  function cachedInlineSource(candidates) {
    var base = validHttpBase(storageGet("showy_inline_pro_source_base"));
    var allowed =
      candidates && candidates.length
        ? candidates
        : inlineSourceCandidates(state.proPayload || {});
    if (!base) return "";
    if (!allowed.length || allowed.indexOf(base) < 0) return "";
    return base;
  }

  function setInlineSource(active, base, verified) {
    var previous = state.inlineSourceBase;
    var adapterId;
    var detail;
    state.proActive = !!active;
    state.inlineSourceBase = active ? validHttpBase(base) : "";
    if (active && state.inlineSourceBase) {
      storageSet("showy_inline_pro_active", "1");
      storageSet("showy_inline_pro_source_base", state.inlineSourceBase);
      if (verified)
        storageSet(
          "showy_inline_pro_verified_at",
          String(new Date().getTime()),
        );
    } else {
      storageSet("showy_inline_pro_active", "");
      storageSet("showy_inline_pro_source_base", "");
      storageSet("showy_inline_pro_verified_at", "");
    }
    detail = {
      active: state.proActive,
      source_base: state.inlineSourceBase,
      changed: previous !== state.inlineSourceBase,
    };
    if (detail.changed) {
      for (adapterId in state.sourceAdapters) {
        if (
          !Object.prototype.hasOwnProperty.call(state.sourceAdapters, adapterId)
        )
          continue;
        try {
          state.sourceAdapters[adapterId].onChange(detail);
        } catch (ignored) {}
      }
    }
    try {
      window.dispatchEvent(
        new CustomEvent("showy:inline-pro-changed", {
          detail: detail,
        }),
      );
    } catch (e) {}
    return previous !== state.inlineSourceBase;
  }

  function registerSourceAdapter(adapter) {
    adapter = adapter || {};
    var originalBase = validHttpBase(adapter.originalBase);
    var adapterId = String(adapter.id || originalBase || "source");
    if (!originalBase || typeof adapter.onChange !== "function") return false;
    state.sourceAdapters[adapterId] = {
      originalBase: originalBase,
      onChange: adapter.onChange,
    };
    if (state.proActive && state.inlineSourceBase) {
      try {
        adapter.onChange({
          active: true,
          source_base: state.inlineSourceBase,
          changed: state.inlineSourceBase !== originalBase,
        });
      } catch (ignored) {}
    }
    return true;
  }

  function hasSourceAdapter() {
    var adapterId;
    for (adapterId in state.sourceAdapters) {
      if (Object.prototype.hasOwnProperty.call(state.sourceAdapters, adapterId))
        return true;
    }
    return false;
  }

  function sourceBase(originalBase) {
    var original = normalizeBase(originalBase);
    if (state.proActive && state.inlineSourceBase)
      return state.inlineSourceBase;
    if (securityV2()) return original;
    if (storageGet("showy_inline_pro_active") === "1") {
      if (!lampaStorageGet("showy_token")) {
        clearOfflineAccess();
        storageSet("showy_inline_pro_active", "");
        storageSet("showy_inline_pro_source_base", "");
        storageSet("showy_inline_pro_verified_at", "");
        return original;
      }
      var cached = cachedInlineSource();
      if (cached) return cached;
    }
    return original;
  }

  function rewriteSourceUrl(url, originalBase) {
    url = String(url || "");
    var original = normalizeBase(originalBase);
    var selected = sourceBase(original);
    if (!original || !selected || selected === original) return url;
    if (url === original) return selected;
    if (url.indexOf(original + "/") === 0)
      return selected + url.slice(original.length);
    return url;
  }

  function probeInlineSource(base, token, callback) {
    var xhr = new XMLHttpRequest();
    var finished = false;
    function complete(ok) {
      if (finished) return;
      finished = true;
      callback(!!ok);
    }
    xhr.open(
      "GET",
      base + "/lite/withsearch?showy_token=" + encodeURIComponent(token),
      true,
    );
    xhr.timeout = 7000;
    xhr.onreadystatechange = function () {
      var payload;
      var hasProSource = false;
      var i;
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          payload = JSON.parse(xhr.responseText || "[]");
        } catch (e) {
          payload = [];
        }
        if (Object.prototype.toString.call(payload) === "[object Array]") {
          for (i = 0; i < payload.length; i += 1) {
            if (
              /^(alloha|kinopub|pidtor|collaps(?:-dash)?)$/i.test(
                String(payload[i] || ""),
              )
            ) {
              hasProSource = true;
              break;
            }
          }
        }
      }
      complete(hasProSource);
    };
    xhr.ontimeout = function () {
      complete(false);
    };
    xhr.onerror = function () {
      complete(false);
    };
    xhr.send(null);
  }

  function chooseInlineSource(pro, forceProbe, callback) {
    var candidates = inlineSourceCandidates(pro);
    var cached = cachedInlineSource(candidates);
    var verifiedAt =
      parseInt(storageGet("showy_inline_pro_verified_at"), 10) || 0;
    var cacheFresh =
      cached && new Date().getTime() - verifiedAt < 6 * 60 * 60 * 1000;
    var token = String((pro && pro.showy_token) || state.showyToken || "");
    var probeId = state.inlineSourceProbeId + 1;
    var pending;
    var completed = false;
    state.inlineSourceProbeId = probeId;

    if (!candidates.length) {
      callback({
        base: "",
        verified: false,
        changed: setInlineSource(true, "", false),
      });
      return;
    }
    if (!forceProbe && cacheFresh) {
      callback({
        base: cached,
        verified: true,
        changed: setInlineSource(true, cached, false),
      });
      return;
    }
    if (!token) {
      callback({
        base: cached || candidates[0],
        verified: false,
        changed: setInlineSource(true, cached || candidates[0], false),
      });
      return;
    }

    pending = candidates.length;
    function finish(base, verified) {
      if (completed || state.inlineSourceProbeId !== probeId) return;
      completed = true;
      callback({
        base: base,
        verified: verified,
        changed: setInlineSource(true, base, verified),
      });
    }
    function probed(base, ok) {
      if (completed || state.inlineSourceProbeId !== probeId) return;
      if (ok) {
        finish(base, true);
        return;
      }
      pending -= 1;
      if (pending === 0) finish(cached || candidates[0], false);
    }
    for (var i = 0; i < candidates.length; i += 1) {
      (function (base) {
        probeInlineSource(base, token, function (ok) {
          probed(base, ok);
        });
      })(candidates[i]);
    }
  }

  function request(path, payload, success, failure) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", state.apiBase + path, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 15000;
    xhr.onreadystatechange = function () {
      var body;
      if (xhr.readyState !== 4) return;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch (e) {
        body = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (success) success(body);
      } else if (failure) {
        failure(body, xhr.status);
      }
    };
    xhr.ontimeout = function () {
      if (failure) failure({ detail: "timeout" }, 0);
    };
    xhr.onerror = function () {
      if (failure) failure({ detail: "network" }, 0);
    };
    xhr.send(JSON.stringify(payload || {}));
  }

  function utf8Bytes(value) {
    var encoded = unescape(encodeURIComponent(String(value || "")));
    var bytes = new Uint8Array(encoded.length);
    for (var i = 0; i < encoded.length; i += 1)
      bytes[i] = encoded.charCodeAt(i);
    return bytes;
  }

  function proofMatches(buffer, difficulty) {
    var bytes = new Uint8Array(buffer);
    var fullBytes = Math.floor(difficulty / 8);
    var remaining = difficulty % 8;
    var i;
    for (i = 0; i < fullBytes; i += 1) {
      if (bytes[i] !== 0) return false;
    }
    return !remaining || bytes[fullBytes] >> (8 - remaining) === 0;
  }

  function sha256Fallback(bytes) {
    var constants = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
      0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
      0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
      0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    var initial = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
      0x1f83d9ab, 0x5be0cd19,
    ];
    var bitLength = bytes.length * 8;
    var totalLength = Math.ceil((bytes.length + 9) / 64) * 64;
    var data = new Uint8Array(totalLength);
    var words = new Uint32Array(64);
    var hash = initial.slice(0);
    var offset;
    var index;
    data.set(bytes);
    data[bytes.length] = 0x80;
    for (index = 0; index < 8; index += 1) {
      data[totalLength - 1 - index] =
        Math.floor(bitLength / Math.pow(256, index)) & 0xff;
    }
    for (offset = 0; offset < totalLength; offset += 64) {
      for (index = 0; index < 16; index += 1) {
        var wordOffset = offset + index * 4;
        words[index] =
          ((data[wordOffset] << 24) |
            (data[wordOffset + 1] << 16) |
            (data[wordOffset + 2] << 8) |
            data[wordOffset + 3]) >>>
          0;
      }
      for (index = 16; index < 64; index += 1) {
        var previous15 = words[index - 15];
        var previous2 = words[index - 2];
        var sigma0 =
          (((previous15 >>> 7) | (previous15 << 25)) ^
            ((previous15 >>> 18) | (previous15 << 14)) ^
            (previous15 >>> 3)) >>>
          0;
        var sigma1 =
          (((previous2 >>> 17) | (previous2 << 15)) ^
            ((previous2 >>> 19) | (previous2 << 13)) ^
            (previous2 >>> 10)) >>>
          0;
        words[index] =
          (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
      }
      var a = hash[0];
      var b = hash[1];
      var c = hash[2];
      var d = hash[3];
      var e = hash[4];
      var f = hash[5];
      var g = hash[6];
      var h = hash[7];
      for (index = 0; index < 64; index += 1) {
        var bigSigma1 =
          (((e >>> 6) | (e << 26)) ^
            ((e >>> 11) | (e << 21)) ^
            ((e >>> 25) | (e << 7))) >>>
          0;
        var choice = ((e & f) ^ (~e & g)) >>> 0;
        var temp1 =
          (h + bigSigma1 + choice + constants[index] + words[index]) >>> 0;
        var bigSigma0 =
          (((a >>> 2) | (a << 30)) ^
            ((a >>> 13) | (a << 19)) ^
            ((a >>> 22) | (a << 10))) >>>
          0;
        var majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var temp2 = (bigSigma0 + majority) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }
      hash[0] = (hash[0] + a) >>> 0;
      hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0;
      hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0;
      hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0;
      hash[7] = (hash[7] + h) >>> 0;
    }
    var digest = new Uint8Array(32);
    for (index = 0; index < hash.length; index += 1) {
      digest[index * 4] = hash[index] >>> 24;
      digest[index * 4 + 1] = hash[index] >>> 16;
      digest[index * 4 + 2] = hash[index] >>> 8;
      digest[index * 4 + 3] = hash[index];
    }
    return digest;
  }

  function solveChallenge(challenge, difficulty, success, failure) {
    difficulty = Math.max(parseInt(difficulty, 10) || 0, 0);
    if (!difficulty) {
      success("0");
      return;
    }
    var nonce = 0;
    var stopped = false;
    var hasSubtle = !!(
      window.crypto &&
      window.crypto.subtle &&
      window.crypto.subtle.digest &&
      window.Promise
    );
    function fallbackBatch() {
      if (stopped) return;
      for (var index = 0; index < 128; index += 1) {
        var candidate = nonce + index;
        var digest = sha256Fallback(utf8Bytes(challenge + ":" + candidate));
        if (proofMatches(digest, difficulty)) {
          stopped = true;
          success(String(candidate));
          return;
        }
      }
      nonce += 128;
      if (nonce > 2000000) {
        stopped = true;
        failure({ detail: "secure_hash_limit" });
        return;
      }
      setTimeout(fallbackBatch, 0);
    }
    function batch() {
      if (stopped) return;
      var jobs = [];
      for (var index = 0; index < 64; index += 1) {
        (function (candidate) {
          jobs.push(
            window.crypto.subtle
              .digest("SHA-256", utf8Bytes(challenge + ":" + candidate))
              .then(function (digest) {
                return { nonce: candidate, digest: digest };
              }),
          );
        })(nonce + index);
      }
      nonce += 64;
      window.Promise.all(jobs)
        .then(function (results) {
          for (var i = 0; i < results.length; i += 1) {
            if (proofMatches(results[i].digest, difficulty)) {
              stopped = true;
              success(String(results[i].nonce));
              return;
            }
          }
          if (nonce > 2000000) {
            stopped = true;
            failure({ detail: "secure_hash_limit" });
            return;
          }
          setTimeout(batch, 0);
        })
        .catch(function () {
          stopped = true;
          failure({ detail: "secure_hash_failed" });
        });
    }
    if (hasSubtle) batch();
    else fallbackBatch();
  }

  function platformName() {
    try {
      if (Lampa.Platform.is("tizen")) return "tizen";
      if (Lampa.Platform.is("webos")) return "webos";
      if (Lampa.Platform.is("android")) return "android";
      if (Lampa.Platform.is("apple")) return "ios";
    } catch (e) {}
    return "web";
  }

  function clientKind() {
    if (state.options.clientKind) return state.options.clientKind;
    var ua = String((window.navigator && window.navigator.userAgent) || "");
    var screenWidth =
      window.innerWidth || (window.screen ? window.screen.width : 0);
    var screenHeight =
      window.innerHeight || (window.screen ? window.screen.height : 0);
    var screenMinSide =
      screenWidth && screenHeight
        ? Math.min(screenWidth, screenHeight)
        : screenWidth;
    var screenRatio = screenHeight ? screenWidth / screenHeight : 1;
    var hasTouch =
      "ontouchstart" in window ||
      (window.navigator && window.navigator.maxTouchPoints > 0) ||
      (window.navigator && window.navigator.msMaxTouchPoints > 0);
    if (/tizen|web0s|webos|smart-tv|smarttv|hbbtv|netcast/i.test(ua))
      return "tv";
    if (/iphone|ipad|ipod|android[^;)]*mobile|\bmobile\b/i.test(ua))
      return "mobile";
    if (
      hasTouch &&
      (screenRatio < 1.6 || screenRatio > 2 || screenMinSide <= 500)
    )
      return "mobile";
    try {
      if (Lampa.Platform.is("tizen") || Lampa.Platform.is("webos")) return "tv";
      if (Lampa.Platform.is("android")) return "tv";
    } catch (e) {}
    return "desktop";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeImage(value) {
    value = String(value || "");
    return /^https?:\/\//i.test(value) ? value : "";
  }

  function activeControllerName() {
    try {
      if (!Lampa.Controller || !Lampa.Controller.enabled) return "";
      var enabled = Lampa.Controller.enabled();
      if (typeof enabled === "string") return enabled;
      return enabled && enabled.name ? enabled.name : "";
    } catch (e) {
      return "";
    }
  }

  function rememberModalController() {
    var name = activeControllerName();
    if (name && name !== "modal") state.modalController = name;
  }

  function nativeModalOpened() {
    try {
      if (Lampa.Modal && Lampa.Modal.opened) return !!Lampa.Modal.opened();
    } catch (e) {}
    return !!document.querySelector(".modal");
  }

  function cancelModalRestore() {
    if (state.modalRestoreTimer) clearTimeout(state.modalRestoreTimer);
    if (state.modalRestoreVerifyTimer)
      clearTimeout(state.modalRestoreVerifyTimer);
    state.modalRestoreTimer = null;
    state.modalRestoreVerifyTimer = null;
  }

  function cancelModalFocusGuard() {
    if (state.modalFocusTimer) clearTimeout(state.modalFocusTimer);
    state.modalFocusTimer = null;
  }

  function startModalFocusGuard() {
    cancelModalFocusGuard();
    function guard() {
      state.modalFocusTimer = null;
      if (!state.modalOpen || !nativeModalOpened()) return;
      if (activeControllerName() !== "modal") {
        try {
          if (Lampa.Controller && Lampa.Controller.toggle)
            Lampa.Controller.toggle("modal");
        } catch (e) {}
      }
      state.modalFocusTimer = setTimeout(guard, 180);
    }
    state.modalFocusTimer = setTimeout(guard, 180);
  }

  function restoreModalController() {
    var target = state.modalController || "content";
    state.modalController = "";
    cancelModalRestore();
    function restore() {
      if (
        state.modalOpen ||
        nativeModalOpened() ||
        activeControllerName() === target
      )
        return;
      try {
        if (Lampa.Controller && Lampa.Controller.toggle)
          Lampa.Controller.toggle(target);
      } catch (e) {
        try {
          if (Lampa.Controller && Lampa.Controller.toggle)
            Lampa.Controller.toggle("content");
        } catch (ignored) {}
      }
    }
    state.modalRestoreTimer = setTimeout(function () {
      state.modalRestoreTimer = null;
      restore();
    }, 60);
    state.modalRestoreVerifyTimer = setTimeout(function () {
      state.modalRestoreVerifyTimer = null;
      restore();
    }, 420);
  }

  function closeModal(restore) {
    var shouldRestore = state.modalOpen || !!state.modalController;
    cancelModalFocusGuard();
    try {
      if (state.modalOpen && Lampa.Modal && Lampa.Modal.close)
        Lampa.Modal.close();
    } catch (e) {}
    state.modalOpen = false;
    if (restore !== false && shouldRestore) restoreModalController();
  }

  function openModal(params) {
    if (!Lampa.Modal || !Lampa.Modal.open) return false;
    if (!state.modalOpen && nativeModalOpened()) return false;
    cancelModalRestore();
    cancelModalFocusGuard();
    if (!state.modalOpen) rememberModalController();
    else closeModal(false);
    try {
      Lampa.Modal.open(params);
      state.modalOpen = true;
      startModalFocusGuard();
      return true;
    } catch (e) {
      state.modalOpen = false;
      restoreModalController();
      return false;
    }
  }

  function closeModalForActivityRefresh() {
    closeModal(false);
    state.modalController = "";
    cancelModalRestore();
  }

  function notify(text) {
    try {
      if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text);
    } catch (e) {}
  }

  function addStyles() {
    if (document.getElementById("showy-marketing-runtime-style")) return;
    var style = document.createElement("style");
    style.id = "showy-marketing-runtime-style";
    style.type = "text/css";
    style.innerHTML =
      ".showy-marketing-card{box-sizing:border-box;width:100%;min-width:0;max-width:760px;max-height:70vh;overflow:auto;padding:20px;color:#fff;text-align:left;}" +
      ".showy-marketing-card__media{display:block;width:100%;max-height:260px;object-fit:cover;border-radius:6px;margin:0 0 16px;}" +
      ".showy-marketing-card__text{font-size:20px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;}" +
      ".showy-marketing-payment{text-align:center;padding:12px;box-sizing:border-box;}" +
      ".showy-marketing-payment img{width:260px;max-width:72vw;aspect-ratio:1;object-fit:contain;border-radius:6px;background:#fff;}" +
      ".showy-marketing-payment__amount{font-size:22px;line-height:1.4;margin:0 0 14px;}" +
      ".showy-marketing-success{box-sizing:border-box;width:100%;min-width:0;max-width:760px;max-height:72vh;overflow:auto;padding:18px;color:#fff;text-align:left;}" +
      ".showy-marketing-success__title{font-size:28px;font-weight:700;line-height:1.2;margin:0 0 16px;text-align:center;}" +
      ".showy-marketing-success__layout{display:block;}" +
      ".showy-marketing-success__copy{min-width:0;font-size:18px;line-height:1.35;overflow-wrap:anywhere;}" +
      ".showy-marketing-success__lead{font-size:20px;margin:0 0 8px;}" +
      ".showy-marketing-success__date{margin:0 0 8px;}" +
      ".showy-marketing-success__hint{margin:0;color:#d8e0e6;}" +
      ".showy-marketing-expired{box-sizing:border-box;width:100%;min-width:0;max-width:760px;max-height:72vh;overflow:auto;padding:12px;color:#fff;text-align:center;}" +
      ".showy-marketing-expired__title{font-size:24px;font-weight:700;line-height:1.25;margin:0 0 8px;}" +
      ".showy-marketing-expired__copy{font-size:16px;line-height:1.35;margin:0 auto 8px;max-width:680px;overflow-wrap:anywhere;white-space:pre-wrap;}" +
      ".showy-marketing-expired__qr{display:block;width:160px;max-width:48vw;aspect-ratio:1;object-fit:contain;border-radius:6px;background:#fff;margin:8px auto;}" +
      ".showy-marketing-expired__link{font-size:14px;line-height:1.3;padding:8px 10px;border:1px solid #53616d;border-radius:6px;background:#171c20;overflow-wrap:anywhere;user-select:text;}" +
      "@media(max-height:760px) and (min-width:601px){.showy-marketing-payment{padding:6px 10px}.showy-marketing-payment img{width:210px}.showy-marketing-payment__amount{margin-bottom:8px}.showy-marketing-payment .showy-marketing-expired__title{font-size:22px}.showy-marketing-payment .showy-marketing-expired__copy{margin-bottom:6px}.showy-marketing-payment .showy-marketing-expired__link{padding:6px 8px}}" +
      "@media(max-height:620px) and (min-width:601px){.showy-marketing-expired,.showy-marketing-payment{padding:5px 9px;max-height:76vh}.showy-marketing-expired__title,.showy-marketing-payment .showy-marketing-expired__title{font-size:19px;line-height:1.2;margin-bottom:5px}.showy-marketing-expired__copy,.showy-marketing-payment .showy-marketing-expired__copy{font-size:13px;line-height:1.25;margin-bottom:5px}.showy-marketing-expired__qr,.showy-marketing-payment .showy-marketing-expired__qr{width:140px;margin:4px auto}.showy-marketing-expired__link,.showy-marketing-payment .showy-marketing-expired__link{font-size:11px;line-height:1.2;padding:4px 6px}}" +
      "@media(max-height:540px) and (min-width:601px){.showy-marketing-expired,.showy-marketing-payment{padding:4px 8px;max-height:72vh}.showy-marketing-expired__title,.showy-marketing-payment .showy-marketing-expired__title{font-size:17px;line-height:1.15;margin-bottom:3px}.showy-marketing-expired__copy,.showy-marketing-payment .showy-marketing-expired__copy{font-size:11px;line-height:1.2;margin-bottom:3px}.showy-marketing-expired__qr,.showy-marketing-payment .showy-marketing-expired__qr{width:112px;margin:3px auto}.showy-marketing-expired__link,.showy-marketing-payment .showy-marketing-expired__link{font-size:10px;line-height:1.15;padding:3px 5px}.showy-marketing-payment__amount{font-size:15px;line-height:1.2;margin-bottom:3px}.showy-marketing-payment img{width:112px}}" +
      "@media(max-width:600px){.showy-marketing-card{padding:14px}.showy-marketing-card__text{font-size:17px}.showy-marketing-card__media{max-height:190px}.showy-marketing-success{padding:10px;max-height:66vh}.showy-marketing-success__title{font-size:22px;margin-bottom:8px}.showy-marketing-success__copy{font-size:15px;line-height:1.3}.showy-marketing-success__lead{font-size:17px;margin-bottom:6px}.showy-marketing-success__date{margin-bottom:6px}.showy-marketing-expired{padding:10px;max-height:66vh}.showy-marketing-expired__title{font-size:21px;margin-bottom:8px}.showy-marketing-expired__copy{font-size:15px;line-height:1.3;margin-bottom:10px}.showy-marketing-expired__link{font-size:13px;padding:8px}}" +
      "@media(max-height:520px){.showy-marketing-success{padding:6px;max-height:64vh}.showy-marketing-success__title{font-size:18px;line-height:1.15;margin-bottom:5px}.showy-marketing-success__copy{font-size:13px;line-height:1.2}.showy-marketing-success__lead{font-size:14px;line-height:1.2;margin-bottom:4px}.showy-marketing-success__date{margin-bottom:4px}.showy-marketing-success__hint{font-size:12px;line-height:1.2}.showy-marketing-expired{padding:7px;max-height:72vh}.showy-marketing-expired__title{font-size:18px;line-height:1.15;margin-bottom:5px}.showy-marketing-expired__copy{font-size:13px;line-height:1.2;margin-bottom:6px}.showy-marketing-expired__link{font-size:12px;padding:6px}}" +
      "@media(max-height:520px) and (min-width:601px){.showy-marketing-expired,.showy-marketing-payment{padding:4px 8px}.showy-marketing-expired__title,.showy-marketing-payment .showy-marketing-expired__title{font-size:17px;line-height:1.15;margin-bottom:3px}.showy-marketing-expired__copy,.showy-marketing-payment .showy-marketing-expired__copy{font-size:11px;line-height:1.2;margin-bottom:3px}.showy-marketing-expired__qr,.showy-marketing-payment .showy-marketing-expired__qr{width:100px;margin:2px auto}.showy-marketing-expired__link,.showy-marketing-payment .showy-marketing-expired__link{font-size:10px;line-height:1.15;padding:3px 5px}}";
    document.head.appendChild(style);
  }

  function identityPayload() {
    return {
      credential: state.credential || null,
      showy_token: state.showyToken || null,
    };
  }

  function cardOffersSubscription(card) {
    var buttons = (card && card.buttons) || [];
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      var action = String(buttons[i].action || "");
      if (
        action === "trial" ||
        action === "pro" ||
        action === "paywall" ||
        action === "offer_checkout" ||
        action.indexOf("offer:") === 0
      )
        return true;
    }
    return false;
  }

  function cardOffersTrial(card) {
    var buttons = (card && card.buttons) || [];
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      if (String(buttons[i].action || "") === "trial") return true;
    }
    return false;
  }

  function suppressSubscriptionCard(card) {
    return state.proAccountActive && cardOffersSubscription(card);
  }

  function submitEvent(type, touchId, payload, success, failure) {
    var identity = identityPayload();
    request(
      "/marketing/v1/events",
      {
        event_id: uid("plugin-" + type),
        event_type: type,
        credential: identity.credential,
        showy_token: identity.showy_token,
        touch_id: touchId || null,
        payload: payload || {},
      },
      success,
      failure,
    );
  }

  function qrImageUrl(url, size) {
    var side = size || 280;
    return (
      "https://api.qrserver.com/v1/create-qr-code/?size=" +
      side +
      "x" +
      side +
      "&data=" +
      encodeURIComponent(url)
    );
  }

  function showQr(url, title) {
    if (!currentComponentIsActive()) return false;
    var qr = qrImageUrl(url, 280);
    function closeQr() {
      stopPolling();
      closeModal();
    }
    openModal({
      title: title || "",
      align: "center",
      zIndex: 310,
      html: $(
        '<div class="showy-marketing-payment"><img src="' +
          escapeHtml(qr) +
          '" alt="QR"></div>',
      ),
      buttons: [{ name: "Закрыть", onSelect: closeQr }],
      onBack: closeQr,
    });
  }

  function openExternal(url, title) {
    if (!url) return;
    if (validBotDeepLink(url)) {
      showBotLinkModal(url, title);
      return;
    }
    if (clientKind() === "tv") {
      showQr(url, title);
      return;
    }
    try {
      window.location.href = url;
    } catch (e) {
      window.open(url, "_blank");
    }
  }

  function validBotPaymentUrl(value) {
    value = String(value || "");
    return /^https:\/\/t\.me\/[a-z0-9_]+\?start=(?:p_|wtchpay_)[a-z0-9_-]+$/i.test(
      value,
    )
      ? value
      : "";
  }

  function validBotDeepLink(value) {
    value = String(value || "");
    return /^https:\/\/t\.me\/[a-z0-9_]+\?start=(?:(?:p|wtchpay|wtchlink|offer|trial|ctx)_[a-z0-9_-]+|pro|tutorial)$/i.test(
      value,
    )
      ? value
      : "";
  }

  function validSbpPaymentUrl(value) {
    value = String(value || "");
    return /^https:\/\/[^\s]+$/i.test(value) ? value : "";
  }

  function directWtchPayments() {
    return (
      String((state.options && state.options.component) || "").toLowerCase() ===
      "wtch"
    );
  }

  function directInvoiceKey(offerGrantId) {
    return (
      String(state.credential || "") +
      ":" +
      String(state.sessionId || "") +
      ":" +
      String(offerGrantId || "standard")
    );
  }

  function requestDirectWtchInvoice(offerGrantId, success, failure) {
    var key;
    var pending;
    var requestId;
    var generation;
    if (!state.credential) return false;
    generation = state.sessionGeneration;
    key = directInvoiceKey(offerGrantId);
    if (state.directInvoices[key]) {
      setTimeout(function () {
        if (success) success(state.directInvoices[key]);
      }, 0);
      return true;
    }
    pending = state.directInvoicePending[key];
    if (pending) {
      pending.push({ success: success, failure: failure });
      return true;
    }
    pending = [{ success: success, failure: failure }];
    state.directInvoicePending[key] = pending;
    requestId = offerGrantId
      ? "offer-" + offerGrantId + "-" + state.sessionId
      : "checkout-" +
        state.sessionId +
        "-" +
        (state.card ? state.card.touch_id : "pro");
    request(
      "/marketing/v1/wtch/invoices",
      {
        request_id: requestId,
        credential: state.credential,
        months: 1,
        client_kind: clientKind(),
        direct_sbp: true,
        offer_grant_id: offerGrantId || null,
        configuration: {
          has_iptv: false,
          has_vpn: false,
          extra_devices_count: 5,
        },
      },
      function (invoice) {
        var callbacks = state.directInvoicePending[key] || [];
        var i;
        delete state.directInvoicePending[key];
        if (
          generation !== state.sessionGeneration ||
          !currentComponentIsActive()
        )
          return;
        if (
          invoice &&
          invoice.mode === "sbp" &&
          validSbpPaymentUrl(invoice.payment_url)
        ) {
          state.directInvoices[key] = invoice;
        }
        for (i = 0; i < callbacks.length; i += 1) {
          if (callbacks[i].success) callbacks[i].success(invoice);
        }
      },
      function (error) {
        var callbacks = state.directInvoicePending[key] || [];
        var i;
        delete state.directInvoicePending[key];
        if (
          generation !== state.sessionGeneration ||
          !currentComponentIsActive()
        )
          return;
        for (i = 0; i < callbacks.length; i += 1) {
          if (callbacks[i].failure) callbacks[i].failure(error);
        }
      },
    );
    return true;
  }

  function publishOfferBanner(offer, card, pro) {
    var detail = null;
    var url;
    var grantId;
    var buttons;
    var i;
    function dispatch(value) {
      try {
        window.dispatchEvent(
          new CustomEvent("showy:offer-banner", {
            detail: value,
          }),
        );
      } catch (e) {}
    }
    if (pro && (pro.account_active || pro.active)) {
      dispatch(null);
      return;
    }
    if (offer) {
      url = validBotPaymentUrl(offer.url);
      grantId = String(offer.offer_grant_id || "");
      if (url && grantId) {
        detail = {
          offer_code: String(offer.offer_code || ""),
          offer_grant_id: grantId,
          title: String(offer.title || "Персональное предложение"),
          text: String(offer.text || ""),
          offer_description: String(offer.offer_description || ""),
          valid_until: String(offer.valid_until || ""),
          url: url,
        };
        buttons = (card && card.buttons) || [];
        for (i = 0; i < buttons.length; i += 1) {
          if (
            String(buttons[i].action || "") === "offer_checkout" &&
            String(buttons[i].offer_grant_id || "") === grantId
          ) {
            buttons[i].url = url;
            buttons[i].offer_valid_until = String(offer.valid_until || "");
          }
        }
      }
    }
    if (
      !detail &&
      !offer &&
      !paidCardButton(card) &&
      directWtchPayments() &&
      state.credential &&
      !(pro && pro.active)
    ) {
      requestBotPaymentLink(
        null,
        function (paymentUrl) {
          dispatch({
            offer_code: "base_pro",
            offer_grant_id: "",
            title: "Showy PRO",
            text: "",
            offer_description: "",
            valid_until: new Date(
              new Date().getTime() + 6 * 60 * 60 * 1000,
            ).toISOString(),
            url: paymentUrl,
            payment_only: true,
          });
        },
        function () {
          dispatch(null);
        },
      );
      return;
    }
    if (detail && directWtchPayments() && state.credential) {
      requestDirectWtchInvoice(
        parseInt(detail.offer_grant_id, 10),
        function (invoice) {
          var directUrl = validSbpPaymentUrl(invoice && invoice.payment_url);
          if (
            !directUrl ||
            !invoice.checkout_id ||
            !/^(liontech|wata)$/.test(String(invoice.provider || ""))
          ) {
            dispatch(detail);
            return;
          }
          dispatch({
            offer_code: detail.offer_code,
            offer_grant_id: detail.offer_grant_id,
            title: detail.title,
            text: detail.text,
            offer_description: detail.offer_description,
            valid_until: detail.valid_until,
            url: directUrl,
            payment_mode: "sbp",
            provider: String(invoice.provider),
            checkout_id: String(invoice.checkout_id),
            amount: String(invoice.amount || ""),
            currency: String(invoice.currency || ""),
          });
        },
        function () {
          dispatch(detail);
        },
      );
      return;
    }
    dispatch(detail);
  }

  function copyText(value, done) {
    var finished = false;
    function complete(ok) {
      if (finished) return;
      finished = true;
      if (done) done(!!ok);
    }
    try {
      if (
        window.navigator &&
        window.navigator.clipboard &&
        window.navigator.clipboard.writeText
      ) {
        var operation = window.navigator.clipboard.writeText(value);
        if (operation && operation.then) {
          operation.then(
            function () {
              complete(true);
            },
            function () {
              complete(false);
            },
          );
          return;
        }
        complete(true);
        return;
      }
    } catch (e) {}
    try {
      var field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "readonly");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      complete(document.execCommand && document.execCommand("copy"));
      document.body.removeChild(field);
    } catch (ignored) {
      complete(false);
    }
  }

  function showBotLinkModal(url, title, description, hooks) {
    if (!currentComponentIsActive()) return false;
    addStyles();
    url = validBotDeepLink(url);
    if (!url) {
      notify("Ссылка на бота недоступна");
      return false;
    }
    var usesQr = clientKind() !== "mobile";
    var qr = usesQr ? qrImageUrl(url, 250) : "";
    hooks = hooks || {};
    var instruction = usesQr
      ? hooks.requiredQr
        ? "Чтобы получить скидку, обязательно отсканируйте QR-код телефоном до указанной даты."
        : "Отсканируйте QR-код телефоном, чтобы продолжить в Telegram. Ссылка для ручного ввода указана ниже."
      : "Скопируйте ссылку и откройте её в Telegram.";
    var html =
      '<div class="showy-marketing-expired showy-marketing-bot-link">' +
      '<div class="showy-marketing-expired__title">' +
      escapeHtml(title || "Оформить Showy PRO") +
      "</div>" +
      (description
        ? '<p class="showy-marketing-expired__copy">' +
          escapeHtml(description) +
          "</p>"
        : "") +
      '<p class="showy-marketing-expired__copy">' +
      instruction +
      "</p>" +
      (qr
        ? '<img class="showy-marketing-expired__qr" src="' +
          escapeHtml(qr) +
          '" alt="QR">'
        : "") +
      '<div class="showy-marketing-expired__link">' +
      escapeHtml(url) +
      "</div>" +
      "</div>";
    var closeLink = function () {
      if (hooks.onClose) hooks.onClose();
      closeModal();
    };
    var buttons = [];
    if (!usesQr) {
      buttons.push({
        name: "Скопировать ссылку",
        onSelect: function () {
          copyText(url, function (copied) {
            if (copied && hooks.onCopy) hooks.onCopy();
            notify(
              copied ? "Ссылка скопирована" : "Не удалось скопировать ссылку",
            );
          });
        },
      });
    }
    buttons.push({ name: "Закрыть", onSelect: closeLink });
    var opened = openModal({
      title: "",
      align: "center",
      zIndex: 310,
      html: $(html),
      buttons: buttons,
      onBack: closeLink,
    });
    return opened;
  }

  function paidCardButton(card) {
    var buttons = (card && card.buttons) || [];
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      var action = String(buttons[i].action || "");
      if (
        action === "offer_checkout" ||
        action === "pro" ||
        action === "paywall"
      ) {
        return buttons[i];
      }
    }
    return null;
  }

  function offerDeadline(value) {
    var date = new Date(String(value || ""));
    var months = [
      "января",
      "февраля",
      "марта",
      "апреля",
      "мая",
      "июня",
      "июля",
      "августа",
      "сентября",
      "октября",
      "ноября",
      "декабря",
    ];
    if (isNaN(date.getTime())) return "";
    return date.getDate() + " " + months[date.getMonth()];
  }

  function paidOfferDescription(card, button) {
    var description = String((card && card.text) || "");
    var offerDescription = String((button && button.offer_description) || "");
    var offerCode = String(
      (button && button.offer_code) || (card && card.offer_code) || "",
    );
    var deadline = offerDeadline(button && button.offer_valid_until);
    var firstSentenceEnd;
    if (offerCode === "intro_3m") {
      description =
        "Плати за месяц - смотри три: Showy PRO на 3 месяца за 499 ₽ вместо 1 497 ₽.\n" +
        "4K у большинства фильмов · выделенные серверы без тормозов · ShowyTOR без настройки TorrServer.\n" +
        "Дополнения: IPTV, VPN и устройства - по обычной цене.";
      if (deadline)
        description += "\nПредложение действует до " + deadline + ".";
      return description;
    }
    if (
      offerDescription &&
      description.indexOf("₽") >= 0 &&
      offerDescription.indexOf("₽") >= 0
    ) {
      firstSentenceEnd = offerDescription.indexOf(". ");
      if (firstSentenceEnd >= 0)
        offerDescription = offerDescription.slice(firstSentenceEnd + 2);
    }
    if (offerDescription && description.indexOf(offerDescription) < 0) {
      description += (description ? "\n\n" : "") + offerDescription;
    }
    if (deadline && description.toLowerCase().indexOf("действует до") < 0) {
      description +=
        (description ? "\n\n" : "") +
        "Предложение действует до " +
        deadline +
        ".";
    }
    return description;
  }

  function showPaidCard(card, button) {
    if (directWtchPayments() && state.credential) {
      state.card = card;
      state.cardPresented = true;
      submitEvent("impression", card.touch_id, {
        creative_id: card.creative_id,
        version: card.creative_version,
        surface: "paid_offer_sbp",
      });
      createWtchInvoice(button.offer_grant_id, {
        title: card.title || "Персональное предложение",
        description: paidOfferDescription(card, button),
        surface: "paid_offer_sbp",
        fallbackUrl: button.url,
        requiredQr: true,
        onCopy: function () {
          submitEvent("click", card.touch_id, {
            action: button.action,
            surface: "paid_offer_link",
            offer_code: button.offer_code || card.offer_code || "",
          });
        },
        onClose: function () {
          submitEvent("dismiss", card.touch_id, {
            source: "paid_offer_sbp",
            stay_free: true,
          });
        },
      });
      return true;
    }
    var url = validBotDeepLink(button && button.url);
    if (!url) return false;
    state.card = card;
    var description = paidOfferDescription(card, button);
    var opened = showBotLinkModal(
      url,
      card.title ||
        (button.action === "offer_checkout"
          ? "Персональное предложение"
          : "Оформить Showy PRO"),
      description,
      {
        requiredQr: button.action === "offer_checkout",
        onCopy: function () {
          submitEvent("click", card.touch_id, {
            action: button.action,
            surface: "paid_offer_link",
            offer_code: button.offer_code || card.offer_code || "",
          });
        },
        onClose: function () {
          submitEvent("dismiss", card.touch_id, {
            source: "paid_offer_link",
            stay_free: true,
          });
        },
      },
    );
    if (!opened) return false;
    state.cardPresented = true;
    submitEvent("impression", card.touch_id, {
      creative_id: card.creative_id,
      version: card.creative_version,
      surface: "paid_offer_link",
    });
    return true;
  }

  function requestBotPaymentLink(offerGrantId, success, failure) {
    if (!state.credential || state.botLinkPending) return false;
    var generation = state.sessionGeneration;
    state.botLinkPending = true;
    request(
      "/marketing/v1/wtch/invoices",
      {
        request_id:
          "bot-link-" +
          state.sessionId +
          "-" +
          (state.card && state.card.touch_id ? state.card.touch_id : "direct") +
          "-" +
          (offerGrantId || "standard"),
        credential: state.credential,
        months: 1,
        client_kind: "mobile",
        offer_grant_id: offerGrantId || null,
        configuration: {
          has_iptv: false,
          has_vpn: false,
          extra_devices_count: 5,
        },
      },
      function (result) {
        if (generation !== state.sessionGeneration) return;
        state.botLinkPending = false;
        var paymentUrl = validBotPaymentUrl(result && result.payment_url);
        if (!paymentUrl) {
          if (failure) failure();
          return;
        }
        if (success) success(paymentUrl);
      },
      function () {
        if (generation !== state.sessionGeneration) return;
        state.botLinkPending = false;
        if (failure) failure();
      },
    );
    return true;
  }

  function openBotPaymentLink(offerGrantId, title, fallbackUrl, description) {
    if (
      !requestBotPaymentLink(
        offerGrantId,
        function (paymentUrl) {
          showBotLinkModal(
            paymentUrl,
            title || "Оформить Showy PRO",
            description,
            { requiredQr: !!offerGrantId },
          );
        },
        function () {
          var fallback = validBotDeepLink(fallbackUrl);
          if (fallback)
            showBotLinkModal(
              fallback,
              title || "Оформить Showy PRO",
              description,
              { requiredQr: !!offerGrantId },
            );
          else notify("Не удалось получить персональную ссылку");
        },
      )
    ) {
      var fallback = validBotDeepLink(fallbackUrl);
      if (fallback)
        showBotLinkModal(fallback, title || "Оформить Showy PRO", description, {
          requiredQr: !!offerGrantId,
        });
      else if (!state.botLinkPending)
        notify("Персональная ссылка сейчас недоступна");
    }
  }

  function showPostTrialPrompt(paymentUrl, expiration, complete) {
    if (!currentComponentIsActive()) {
      if (complete) complete(false);
      return false;
    }
    addStyles();
    var kind = clientKind();
    var usesQr = kind !== "mobile";
    var qr = usesQr ? qrImageUrl(paymentUrl, 180) : "";
    var copy = usesQr
      ? '<p class="showy-marketing-expired__copy">Понравились 4K, все источники и торренты? Отсканируйте QR-код телефоном, чтобы узнать подробнее о Showy PRO в Telegram. Ссылка для ручного ввода указана ниже.</p>'
      : '<p class="showy-marketing-expired__copy">Понравились 4K, все источники и торренты? Скопируйте ссылку, чтобы узнать подробнее о Showy PRO в Telegram.</p>';
    var html =
      '<div class="showy-marketing-expired">' +
      '<div class="showy-marketing-expired__title">Пробный период закончился</div>' +
      copy +
      (qr
        ? '<img class="showy-marketing-expired__qr" src="' +
          escapeHtml(qr) +
          '" alt="QR">'
        : "") +
      '<div class="showy-marketing-expired__link">' +
      escapeHtml(paymentUrl) +
      "</div>" +
      "</div>";
    var closePrompt = function () {
      submitEvent("dismiss", null, {
        surface: "trial_expired",
        stay_free: true,
      });
      closeModal();
    };
    var buttons = [];
    if (!usesQr) {
      buttons.push({
        name: "Скопировать ссылку",
        onSelect: function () {
          copyText(paymentUrl, function (copied) {
            submitEvent("click", null, {
              surface: "trial_expired",
              action: "copy_payment_link",
            });
            notify(
              copied ? "Ссылка скопирована" : "Не удалось скопировать ссылку",
            );
          });
        },
      });
    }
    buttons.push({ name: "Закрыть", onSelect: closePrompt });
    if (
      !openModal({
        title: "",
        align: "center",
        zIndex: 310,
        html: $(html),
        buttons: buttons,
        onBack: closePrompt,
      })
    ) {
      if (complete) complete(false);
      return;
    }
    state.postTrialPromptShown = true;
    var count = pluginTrialPromptCount(expiration) + 1;
    storageSet("showy_plugin_trial_prompt_count", String(count));
    submitEvent("impression", null, {
      surface: "trial_expired",
      impression: count,
      limit: 5,
    });
    if (complete) complete(true);
  }

  function showDirectPostTrialPayment(invoice, expiration, complete) {
    if (
      !currentComponentIsActive() ||
      !validSbpPaymentUrl(invoice && invoice.payment_url)
    ) {
      if (complete) complete(false);
      return false;
    }
    state.postTrialPromptShown = true;
    var count = pluginTrialPromptCount(expiration) + 1;
    storageSet("showy_plugin_trial_prompt_count", String(count));
    submitEvent("impression", null, {
      surface: "trial_expired_sbp",
      impression: count,
      limit: 5,
    });
    showPayment(invoice, {
      title: "Пробный период закончился",
      description:
        "Понравились 4K, все источники и торренты? Продолжите с Showy PRO.",
      surface: "trial_expired_sbp",
      copyPaymentLink: true,
      onClose: function () {
        submitEvent("dismiss", null, {
          surface: "trial_expired_sbp",
          stay_free: true,
        });
      },
      onFailure: function () {
        state.postTrialPromptShown = false;
      },
    });
    if (complete) complete(true);
    return true;
  }

  function maybeShowPostTrialPrompt(expiration, complete) {
    expiration = String(expiration || pluginTrialExpiration() || "");
    if (
      !currentComponentIsActive() ||
      !state.credential ||
      !pluginTrialPromptDue(expiration)
    ) {
      if (complete) complete(false);
      return false;
    }
    var generation = state.sessionGeneration;
    state.postTrialPromptPending = true;
    request(
      "/marketing/v1/wtch/invoices",
      {
        request_id: "post-trial-" + state.sessionId,
        credential: state.credential,
        months: 1,
        client_kind: directWtchPayments() ? clientKind() : "mobile",
        direct_sbp: directWtchPayments(),
        offer_grant_id: null,
        configuration: {
          has_iptv: false,
          has_vpn: false,
          extra_devices_count: 5,
        },
      },
      function (result) {
        if (generation !== state.sessionGeneration) return;
        state.postTrialPromptPending = false;
        if (state.proActive || state.modalOpen) {
          if (complete) complete(false);
          return;
        }
        if (directWtchPayments() && result && result.mode === "sbp") {
          showDirectPostTrialPayment(result, expiration, complete);
          return;
        }
        var paymentUrl = validBotPaymentUrl(result && result.payment_url);
        if (!paymentUrl) {
          if (complete) complete(false);
          return;
        }
        showPostTrialPrompt(paymentUrl, expiration, complete);
      },
      function () {
        if (generation !== state.sessionGeneration) return;
        state.postTrialPromptPending = false;
        if (complete) complete(false);
      },
    );
    return true;
  }

  function stopPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  function verifyWtchPro(pro) {
    if (!pro || !pro.showy_token) return;
    request(
      "/check_wtch_pro_auth/",
      { token: pro.showy_token },
      function (result) {
        try {
          window.dispatchEvent(
            new CustomEvent("showy:wtch-pro-authenticated", {
              detail: { pro: pro, auth: result || {} },
            }),
          );
        } catch (e) {}
      },
    );
  }

  function scheduleProExpiration(pro) {
    if (state.proExpirationTimer) clearTimeout(state.proExpirationTimer);
    state.proExpirationTimer = null;
    if (!pro || !pro.active || !pro.expiration) return;
    var expirationAt = new Date(pro.expiration).getTime();
    if (!expirationAt || isNaN(expirationAt)) return;
    var maxDelay = 2147480000;
    function schedule() {
      var remaining = expirationAt - new Date().getTime();
      if (remaining <= 0) {
        var expiredTrial =
          pro.access_kind === "trial" ||
          pluginTrialExpiration() === String(pro.expiration || "");
        state.proPayload = { active: false, expiration: pro.expiration };
        state.inlineSourceProbeId += 1;
        clearOfflineAccess();
        setInlineSource(false, "", false);
        refreshActivity();
        if (expiredTrial) {
          setTimeout(function () {
            maybeShowPostTrialPrompt(pro.expiration);
          }, 1200);
        }
        return;
      }
      state.proExpirationTimer = setTimeout(
        schedule,
        Math.min(remaining + 250, maxDelay),
      );
    }
    schedule();
  }

  function verifyServerAccess(pro, success, failure) {
    var identity = identityPayload();
    var security = securityIdentityPayload();
    request(
      "/marketing/v2/access/verify",
      {
        credential: identity.credential,
        showy_token: (pro && pro.showy_token) || identity.showy_token,
        installation_id: security.installation_id,
        fingerprint: security.fingerprint,
      },
      function (result) {
        if (
          !result ||
          !result.security ||
          result.security.verified !== true ||
          !result.pro
        ) {
          failure({ detail: "access_not_verified" });
          return;
        }
        success(result.pro);
      },
      failure,
    );
  }

  function applyProActivation(pro, options, done) {
    var cached;
    options = options || {};
    pro = pro || {};
    if (securityV2() && pro.active && !options.serverVerified) {
      verifyServerAccess(
        pro,
        function (verifiedPro) {
          var verifiedOptions = {};
          for (var key in options) {
            if (Object.prototype.hasOwnProperty.call(options, key))
              verifiedOptions[key] = options[key];
          }
          verifiedOptions.serverVerified = true;
          applyProActivation(verifiedPro, verifiedOptions, done);
        },
        function (error, status) {
          if (status === 401 || status === 403) {
            clearOfflineAccess();
            applyProActivation(
              { active: false, expiration: pro.expiration || null },
              {
                serverVerified: true,
                dispatch: options.dispatch,
                authoritative: true,
              },
              done,
            );
            return;
          }
          cached = offlinePayload(pro) || cachedOfflineAccess();
          if (cached) {
            applyProActivation(
              cached,
              {
                serverVerified: true,
                dispatch: options.dispatch,
                offline: true,
              },
              done,
            );
          } else {
            applyProActivation(
              { active: false, expiration: pro.expiration || null },
              {
                serverVerified: true,
                dispatch: options.dispatch,
                authoritative: false,
              },
              done,
            );
          }
        },
      );
      return;
    }
    if (pro.active) {
      cacheOfflineAccess(pro);
    } else if (options.authoritative !== false) {
      clearOfflineAccess();
    }
    state.proPayload = pro;
    state.proActive = !!pro.active;
    state.proAccountActive = !!(pro.account_active || pro.active);
    if (
      (pro.active && pro.access_kind === "trial") ||
      (!pro.active && pro.trial_expired)
    ) {
      rememberPluginTrial(pro.expiration);
    } else if (state.proAccountActive) {
      var storedTrialExpiration = pluginTrialExpiration();
      var storedTrialAt = new Date(storedTrialExpiration).getTime();
      var currentExpirationAt = new Date(pro.expiration || "").getTime();
      if (
        pro.access_kind === "paid" ||
        (storedTrialAt &&
          currentExpirationAt &&
          currentExpirationAt > storedTrialAt + 60000)
      ) {
        clearPluginTrialPrompt();
      }
    }
    scheduleProExpiration(pro);
    if (pro && pro.showy_token) {
      state.showyToken = pro.showy_token;
      lampaStorageSet("showy_token", pro.showy_token);
    }
    function finish(access) {
      if (pro.active) verifyWtchPro(pro);
      if (options.dispatch !== false) {
        try {
          window.dispatchEvent(
            new CustomEvent("showy:pro-activated", {
              detail: {
                pro: pro,
                inline: access || null,
              },
            }),
          );
        } catch (e) {}
      }
      if (done) done(access || { base: "", verified: false, changed: false });
    }
    if (!pro.active) {
      state.inlineSourceProbeId += 1;
      finish({
        base: "",
        verified: false,
        changed: setInlineSource(false, "", false),
      });
      return;
    }
    if (hasSourceAdapter()) {
      chooseInlineSource(pro, !!options.forceProbe, finish);
      return;
    }
    finish({ base: "", verified: true, changed: false });
  }

  function applyCachedOfflineAccess(done) {
    var cached = cachedOfflineAccess();
    if (!cached) return false;
    applyProActivation(
      cached,
      {
        serverVerified: true,
        dispatch: false,
        offline: true,
      },
      done,
    );
    return true;
  }

  function refreshActivity() {
    try {
      if (Lampa.Activity && Lampa.Activity.replace) Lampa.Activity.replace();
    } catch (ignored) {}
  }

  function activeActivityComponent() {
    try {
      var active =
        Lampa.Activity && Lampa.Activity.active
          ? Lampa.Activity.active()
          : null;
      return String((active && active.component) || "");
    } catch (e) {
      return "";
    }
  }

  function activityComponentFor(options) {
    options = options || {};
    if (options.activityComponent) return String(options.activityComponent);
    if (
      options.component === "smotret24_ru" ||
      options.component === "smotret24_com"
    ) {
      return "smotret24";
    }
    if (options.component === "smotretk") return "smotrolet4k";
    return String(options.component || "");
  }

  function registeredComponentForActivity(activityComponent) {
    var component;
    var current = state.activeMarketingComponent;
    if (
      current &&
      state.componentOptions[current] &&
      activityComponentFor(state.componentOptions[current]) ===
        activityComponent
    )
      return current;
    for (component in state.componentOptions) {
      if (
        !Object.prototype.hasOwnProperty.call(state.componentOptions, component)
      )
        continue;
      if (
        activityComponentFor(state.componentOptions[component]) ===
        activityComponent
      )
        return component;
    }
    return "";
  }

  function currentComponentIsActive() {
    if (!state.activeMarketingComponent) return false;
    return activityComponentFor(state.options) === activeActivityComponent();
  }

  function cancelSurfaceRetry() {
    if (state.surfaceRetryTimer) clearTimeout(state.surfaceRetryTimer);
    state.surfaceRetryTimer = null;
  }

  function scheduleSurfaceRetry() {
    if (state.surfaceRetryTimer || !currentComponentIsActive()) return;
    state.surfaceRetryTimer = setTimeout(function () {
      state.surfaceRetryTimer = null;
      presentPendingSurface();
    }, 500);
  }

  function presentPendingSurface() {
    if (!currentComponentIsActive() || state.modalOpen) return false;
    if (nativeModalOpened()) {
      scheduleSurfaceRetry();
      return false;
    }
    if (
      pluginTrialPromptDue() &&
      !state.postTrialPromptPending &&
      !state.postTrialPromptShown
    ) {
      return maybeShowPostTrialPrompt();
    }
    if (state.card && !state.cardPresented) return showCard(state.card);
    return false;
  }

  function activateMarketingComponent(component) {
    var options = state.componentOptions[component];
    var storedTrialAt;
    var directContent = null;
    if (!options) return;
    cancelSurfaceRetry();
    stopPolling();
    closeModal(false);
    state.modalController = "";
    cancelModalRestore();
    if (state.proExpirationTimer) clearTimeout(state.proExpirationTimer);
    state.proExpirationTimer = null;
    state.inlineSourceProbeId += 1;
    state.activeMarketingComponent = component;
    state.options = options;
    state.apiBase = normalizeBase(options.apiBase);
    state.sessionGeneration += 1;
    state.sessionId = uid("session");
    state.contentOpenSent = false;
    try {
      directContent = contentContextForActivity(
        Lampa.Activity && Lampa.Activity.active
          ? Lampa.Activity.active()
          : null,
      );
    } catch (e) {
      directContent = null;
    }
    state.contentContext =
      directContent ||
      (state.observedContentComponent === component
        ? state.observedContent
        : null);
    state.contentCardKey = state.contentContext
      ? state.contentContext.card_key
      : "";
    state.contentSessionId = state.sessionId;
    state.card = null;
    state.cardPresented = false;
    state.trialPending = false;
    state.trialRequestId = "";
    state.postTrialPromptPending = false;
    state.postTrialPromptShown = false;
    state.botLinkPending = false;
    state.contexts = {};
    state.credential = storageGet("showy_marketing_credential");
    state.showyToken = lampaStorageGet("showy_token");
    state.installationId = installationId();
    state.fingerprint = deviceFingerprint();
    state.proPayload = null;
    state.proActive = false;
    state.proAccountActive = false;
    state.inlineSourceBase = "";
    if (securityV2()) {
      applyCachedOfflineAccess(function (access) {
        if (access.changed && isFreeComponent(activeActivityComponent()))
          refreshActivity();
      });
    } else if (storageGet("showy_inline_pro_active") === "1") {
      storedTrialAt = new Date(pluginTrialExpiration()).getTime();
      if (storedTrialAt && storedTrialAt <= new Date().getTime()) {
        storageSet("showy_inline_pro_active", "");
        storageSet("showy_inline_pro_source_base", "");
        storageSet("showy_inline_pro_verified_at", "");
      } else {
        state.proActive = true;
        state.inlineSourceBase = cachedInlineSource();
      }
    }
    if (state.apiBase) registerSession(false, state.sessionGeneration);
  }

  function syncActivityScope() {
    var activityComponent = activeActivityComponent();
    var registered = registeredComponentForActivity(activityComponent);
    if (registered) {
      if (registered !== state.activeMarketingComponent)
        activateMarketingComponent(registered);
      else {
        prepareContentOpenForActivity();
        presentPendingSurface();
      }
      return;
    }
    state.contentCardKey = "";
    state.contentSessionId = "";
    cancelSurfaceRetry();
    if (state.modalOpen) closeModal();
    if (state.activeMarketingComponent) {
      stopPolling();
      if (state.proExpirationTimer) clearTimeout(state.proExpirationTimer);
      state.proExpirationTimer = null;
      state.inlineSourceProbeId += 1;
      state.sessionGeneration += 1;
      state.activeMarketingComponent = "";
      state.card = null;
      state.cardPresented = false;
      state.contexts = {};
    }
  }

  function bindActivityScope() {
    if (state.activityScopeBound) return;
    state.activityScopeBound = true;
    try {
      if (
        Lampa.Storage &&
        Lampa.Storage.listener &&
        Lampa.Storage.listener.follow
      ) {
        Lampa.Storage.listener.follow("change", function (event) {
          if (event && event.name === "activity") {
            observeActivityContent(event.value);
            setTimeout(syncActivityScope, 0);
          }
        });
      }
    } catch (e) {}
  }

  function proActivated(pro) {
    stopPolling();
    applyProActivation(pro, { forceProbe: true }, function () {
      if (!currentComponentIsActive()) return;
      closeModalForActivityRefresh();
      notify("PRO активирован");
      refreshActivity();
    });
  }

  function formattedExpiration(value) {
    var date = new Date(value || "");
    if (isNaN(date.getTime())) return "";
    try {
      return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return date.toLocaleString();
    }
  }

  function formattedTrialDays(value) {
    var days = Math.max(parseInt(value, 10) || 1, 1);
    var mod10 = days % 10;
    var mod100 = days % 100;
    var word = "дней";
    if (mod10 === 1 && mod100 !== 11) word = "день";
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
      word = "дня";
    return days + " " + word;
  }

  function trialActivated(result) {
    result = result || {};
    if (result.credential) {
      state.credential = result.credential;
      storageSet("showy_marketing_credential", result.credential);
    }
    var pro = result.pro || {};
    rememberPluginTrial(result.expiration || pro.expiration);
    var days = formattedTrialDays(result.days);
    var expiration = formattedExpiration(result.expiration || pro.expiration);
    var html =
      '<div class="showy-marketing-success">' +
      '<div class="showy-marketing-success__title">✅ Пробный PRO активирован</div>' +
      '<div class="showy-marketing-success__layout">' +
      '<div class="showy-marketing-success__copy">' +
      '<p class="showy-marketing-success__lead">PRO уже работает в этом плагине. Доступ открыт на <strong>' +
      days +
      "</strong>.</p>" +
      (expiration
        ? '<p class="showy-marketing-success__date">Действует до <strong>' +
          escapeHtml(expiration) +
          "</strong>.</p>"
        : "") +
      '<p class="showy-marketing-success__hint">4K, все PRO-источники и торренты уже доступны. Никакой дополнительной настройки не требуется.</p>' +
      "</div>" +
      "</div></div>";
    var finish = function () {
      closeModalForActivityRefresh();
      refreshActivity();
    };

    stopPolling();
    applyProActivation(pro, { forceProbe: true }, function () {
      if (!currentComponentIsActive()) return;
      addStyles();
      if (
        !openModal({
          title: "",
          align: "center",
          zIndex: 310,
          html: $(html),
          buttons: [{ name: "Смотреть", onSelect: finish }],
          onBack: finish,
        })
      ) {
        notify("Пробный PRO активирован");
        refreshActivity();
      }
    });
  }

  function pollCheckout(checkoutId) {
    var attempts = 0;
    stopPolling();
    state.pollTimer = setInterval(function () {
      attempts += 1;
      request(
        "/marketing/v1/wtch/status",
        {
          checkout_id: checkoutId,
          credential: state.credential,
        },
        function (result) {
          if (result.status === "activated" || result.status === "paid") {
            proActivated(result.pro);
          } else if (
            result.status === "failed" ||
            result.status === "cancelled" ||
            result.status === "expired"
          ) {
            stopPolling();
            notify("Платёж не завершён");
          }
        },
      );
      if (attempts >= 360) stopPolling();
    }, 5000);
  }

  function showPayment(invoice, options) {
    if (!currentComponentIsActive()) return;
    options = options || {};
    if (invoice.mode === "telegram") {
      var botUrl = validBotDeepLink(invoice.payment_url || options.fallbackUrl);
      if (botUrl)
        showBotLinkModal(
          botUrl,
          options.title || "Оформить Showy PRO",
          options.description || "",
          {
            requiredQr: options.requiredQr === true,
            onCopy: options.onCopy,
            onClose: options.onClose,
          },
        );
      return;
    }
    var paymentUrl = validSbpPaymentUrl(invoice.payment_url);
    if (!paymentUrl) {
      if (options.onFailure) options.onFailure();
      else notify("Ссылка для оплаты недоступна");
      return;
    }
    addStyles();
    var usesQr = clientKind() !== "mobile";
    var copyPaymentLink = !usesQr && options.copyPaymentLink === true;
    var amount = escapeHtml(invoice.amount + " " + invoice.currency);
    var qr = safeImage(invoice.qr_url);
    var html =
      '<div class="showy-marketing-payment">' +
      '<div class="showy-marketing-expired__title">' +
      escapeHtml(options.title || "Оплата Showy PRO") +
      "</div>" +
      (options.description
        ? '<p class="showy-marketing-expired__copy">' +
          escapeHtml(options.description) +
          "</p>"
        : "") +
      '<div class="showy-marketing-payment__amount">К оплате: <strong>' +
      amount +
      "</strong></div>" +
      '<p class="showy-marketing-expired__copy">' +
      (usesQr
        ? "Отсканируйте QR-код телефоном и оплатите через СБП."
        : copyPaymentLink
          ? "Скопируйте ссылку и откройте её в приложении банка или браузере."
          : "Откройте оплату и выберите приложение банка.") +
      "</p>" +
      (usesQr && qr ? '<img src="' + escapeHtml(qr) + '" alt="QR">' : "") +
      '<div class="showy-marketing-expired__link">' +
      escapeHtml(paymentUrl) +
      "</div>" +
      "</div>";
    var closePayment = function () {
      stopPolling();
      if (options.onClose) options.onClose();
      closeModal();
    };
    var buttons = [];
    if (!usesQr) {
      buttons.push({
        name: copyPaymentLink ? "Скопировать ссылку" : "Оплатить через СБП",
        onSelect: function () {
          if (options.surface) {
            submitEvent("click", state.card && state.card.touch_id, {
              surface: options.surface,
              action: copyPaymentLink ? "copy_payment_link" : "open_sbp",
            });
          }
          if (copyPaymentLink) {
            copyText(paymentUrl, function (copied) {
              notify(
                copied ? "Ссылка скопирована" : "Не удалось скопировать ссылку",
              );
            });
            return;
          }
          openExternal(paymentUrl, "Оплата Showy PRO");
        },
      });
    }
    buttons.push({ name: "Закрыть", onSelect: closePayment });
    if (
      !openModal({
        title: "",
        align: "center",
        zIndex: 310,
        html: $(html),
        buttons: buttons,
        onBack: closePayment,
      })
    )
      return;
    pollCheckout(invoice.checkout_id);
  }

  function createWtchInvoice(offerGrantId, options) {
    if (!state.credential) return false;
    options = options || {};
    requestDirectWtchInvoice(
      offerGrantId,
      function (invoice) {
        showPayment(invoice, options);
      },
      function (error) {
        var fallback = validBotDeepLink(options.fallbackUrl);
        if (fallback) {
          showBotLinkModal(
            fallback,
            options.title || "Оформить Showy PRO",
            options.description || "",
          );
        } else if (options.onFailure) {
          options.onFailure(error);
        } else {
          notify(
            error && error.detail ? error.detail : "Не удалось создать платёж",
          );
        }
      },
    );
    return true;
  }

  function activateTrial() {
    if (state.trialPending) return;
    if (!state.trialRequestId) {
      state.trialRequestId =
        "trial-" +
        state.sessionId +
        "-" +
        (state.card && state.card.touch_id ? state.card.touch_id : "direct");
    }
    state.trialPending = true;
    var identity = identityPayload();
    var security = securityIdentityPayload();
    var payload = {
      request_id: state.trialRequestId,
      credential: identity.credential,
      showy_token: identity.showy_token,
      session_id: state.sessionId,
      touch_id: state.card && state.card.touch_id ? state.card.touch_id : null,
      context: {
        component: state.options.component || "",
        platform: platformName(),
        client_kind: clientKind(),
        country_code: String(state.options.countryCode || "")
          .slice(0, 2)
          .toUpperCase(),
      },
    };
    if (securityV2()) {
      payload.installation_id = security.installation_id;
      payload.fingerprint = security.fingerprint;
    }
    request(
      securityV2()
        ? "/marketing/v2/trial/activate"
        : "/marketing/v1/trial/activate",
      payload,
      function (result) {
        state.trialPending = false;
        trialActivated(result);
      },
      function () {
        state.trialPending = false;
        notify("Пробный период сейчас недоступен");
      },
    );
  }

  function handleButton(button) {
    var action = String(button.action || "");
    if (action === "trial" && state.trialPending) return;
    if (action === "mute") {
      submitEvent("promo_muted", state.card && state.card.touch_id, {});
      closeModal();
    } else if (action === "dismiss") {
      if (cardOffersTrial(state.card)) {
        submitEvent("trial_deferred", state.card && state.card.touch_id, {
          source: "button",
          grace_hours: 36,
        });
      } else {
        submitEvent("dismiss", state.card && state.card.touch_id, {
          stay_free: true,
        });
      }
      closeModal();
    } else if (action === "trial") {
      submitEvent("click", state.card && state.card.touch_id, {
        action: action,
      });
      activateTrial();
    } else if (action === "offer_checkout") {
      submitEvent("click", state.card && state.card.touch_id, {
        action: action,
      });
      if (directWtchPayments()) {
        createWtchInvoice(button.offer_grant_id, {
          title: "Персональное предложение",
          description: paidOfferDescription(state.card, button),
          surface: "paid_offer_sbp",
          fallbackUrl: button.url,
        });
      } else {
        openBotPaymentLink(
          button.offer_grant_id,
          "Персональное предложение",
          button.url,
          paidOfferDescription(state.card, button),
        );
      }
    } else if (action === "pro" || action === "paywall") {
      submitEvent("click", state.card && state.card.touch_id, {
        action: action,
      });
      if (directWtchPayments()) {
        createWtchInvoice(null, {
          title: "Оформить Showy PRO",
          surface: "pro_sbp",
          fallbackUrl: button.url,
        });
      } else {
        openBotPaymentLink(null, "Оформить Showy PRO", button.url);
      }
    } else if (button.url) {
      submitEvent("click", state.card && state.card.touch_id, {
        action: action,
      });
      openExternal(button.url, button.text);
    }
  }

  function showCard(card) {
    if (!card || !Lampa.Modal || !Lampa.Modal.open) return;
    if (!currentComponentIsActive()) return false;
    if (state.postTrialPromptPending || state.postTrialPromptShown) return;
    if (state.cardPresented) return false;
    if (nativeModalOpened() && !state.modalOpen) {
      scheduleSurfaceRetry();
      return false;
    }
    if (suppressSubscriptionCard(card)) {
      if (state.card === card) state.card = null;
      return;
    }
    state.card = card;
    addStyles();
    var paidButton = paidCardButton(card);
    if (paidButton && !cardOffersTrial(card)) {
      if (!showPaidCard(card, paidButton)) scheduleSurfaceRetry();
      return !!state.cardPresented;
    }
    var image = safeImage(
      card.image_url || (card.content && card.content.poster_url),
    );
    var html =
      '<div class="showy-marketing-card">' +
      (image
        ? '<img class="showy-marketing-card__media" src="' +
          escapeHtml(image) +
          '" alt="">'
        : "") +
      '<div class="showy-marketing-card__text">' +
      escapeHtml(card.text) +
      "</div>" +
      "</div>";
    var modalButtons = [];
    var buttons = card.buttons || [];
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      (function (button) {
        modalButtons.push({
          name: button.text || "Открыть",
          onSelect: function () {
            handleButton(button);
          },
        });
      })(buttons[i]);
    }
    if (
      !openModal({
        title: "",
        align: "center",
        zIndex: 300,
        html: $(html),
        buttons: modalButtons,
        onBack: function () {
          if (cardOffersTrial(card)) {
            submitEvent("trial_deferred", card.touch_id, {
              source: "back",
              grace_hours: 36,
            });
          } else {
            submitEvent("dismiss", card.touch_id, { source: "back" });
          }
          closeModal();
        },
      })
    ) {
      scheduleSurfaceRetry();
      return false;
    }
    state.cardPresented = true;
    submitEvent("impression", card.touch_id, {
      creative_id: card.creative_id,
      version: card.creative_version,
    });
    return true;
  }

  function limitedText(value, limit) {
    value = String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim();
    return value.slice(0, limit);
  }

  function contentContextForActivity(active) {
    var card;
    var imdbId;
    var kinopoiskId;
    var tmdbId;
    var mediaType;
    var releaseDate;
    var year;
    var cardKey;
    card =
      active &&
      (active.card ||
        active.movie ||
        (active.activity && active.activity.card) ||
        (active.activity &&
          active.activity.object &&
          active.activity.object.movie) ||
        (active.activity &&
          active.activity.component &&
          active.activity.component.object &&
          active.activity.component.object.movie));
    if (!card || typeof card !== "object") return null;
    try {
      imdbId = limitedText(card.imdb_id || card.imdb || "", 32).toLowerCase();
      kinopoiskId = limitedText(
        card.kinopoisk_id || card.kp_id || card.kp || "",
        32,
      );
      tmdbId = limitedText(card.tmdb_id || card.id || "", 32);
      mediaType = limitedText(
        card.media_type ||
          card.type ||
          (card.first_air_date ||
          card.number_of_seasons ||
          card.seasons ||
          (active && active.serial)
            ? "tv"
            : "movie"),
        16,
      ).toLowerCase();
      if (
        mediaType !== "tv" &&
        mediaType !== "movie" &&
        mediaType !== "anime"
      ) {
        mediaType =
          mediaType === "series" || mediaType === "serial" ? "tv" : "movie";
      }
      if (tmdbId) cardKey = "tmdb:" + mediaType + ":" + tmdbId;
      else if (kinopoiskId) cardKey = "kp:" + kinopoiskId;
      else if (imdbId) cardKey = "imdb:" + imdbId;
      else return null;

      releaseDate = limitedText(
        card.release_date || card.first_air_date || card.year || "",
        16,
      );
      year = /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : "";
      return {
        card_key: cardKey,
        card_id: tmdbId,
        imdb_id: imdbId,
        kinopoisk_id: kinopoiskId,
        media_type: mediaType,
        title: limitedText(
          card.title ||
            card.name ||
            card.original_title ||
            card.original_name ||
            "",
          180,
        ),
        original_title: limitedText(
          card.original_title || card.original_name || "",
          180,
        ),
        year: year,
        catalog_source: limitedText(
          (active && active.source) || card.source || "tmdb",
          32,
        ),
      };
    } catch (e) {
      return null;
    }
  }

  function activeContentContext() {
    var active;
    var content;
    try {
      active =
        Lampa.Activity && Lampa.Activity.active
          ? Lampa.Activity.active()
          : null;
      content = contentContextForActivity(active);
    } catch (e) {
      content = null;
    }
    return content || state.contentContext;
  }

  function observeActivityContent(activity) {
    var registered;
    var content;
    if (!activity || typeof activity !== "object") return;
    registered = registeredComponentForActivity(
      String(activity.component || ""),
    );
    if (!registered) return;
    content = contentContextForActivity(activity);
    if (!content) return;
    state.observedContent = content;
    state.observedContentComponent = registered;
    if (registered === state.activeMarketingComponent) {
      if (
        !state.contentSessionId ||
        (state.contentCardKey && state.contentCardKey !== content.card_key)
      ) {
        state.contentSessionId = uid("content-session");
        state.contentOpenSent = false;
      }
      state.contentContext = content;
      state.contentCardKey = content.card_key;
    }
  }

  function submitContentOpen(generation, attempt) {
    var content;
    var identity;
    if (generation !== state.sessionGeneration || state.contentOpenSent) return;
    content = activeContentContext();
    if (!content) {
      if ((attempt || 0) < 3) {
        setTimeout(
          function () {
            submitContentOpen(generation, (attempt || 0) + 1);
          },
          250 * ((attempt || 0) + 1),
        );
      }
      return;
    }
    state.contentContext = content;
    identity = identityPayload();
    if (!identity.credential && !identity.showy_token) return;
    state.contentCardKey = content.card_key;
    state.contentOpenSent = true;
    request(
      "/marketing/v1/events",
      {
        event_id: "content-" + (state.contentSessionId || state.sessionId),
        event_type: "content_open",
        credential: identity.credential,
        showy_token: identity.showy_token,
        touch_id: null,
        payload: {
          session_id: state.contentSessionId || state.sessionId,
          context: {
            component: state.options.component || "",
            client_kind: clientKind(),
            content: content,
          },
        },
      },
      null,
      function () {
        if (generation === state.sessionGeneration)
          state.contentOpenSent = false;
      },
    );
  }

  function prepareContentOpenForActivity() {
    var content;
    if (!currentComponentIsActive()) return;
    content = activeContentContext();
    if (!content) return;
    if (
      !state.contentSessionId ||
      (state.contentCardKey && state.contentCardKey !== content.card_key)
    ) {
      state.contentSessionId = uid("content-session");
      state.contentOpenSent = false;
    }
    state.contentContext = content;
    state.contentCardKey = content.card_key;
    submitContentOpen(state.sessionGeneration, 0);
  }

  function sessionPayload() {
    var content = activeContentContext();
    var payload = {
      session_id: state.sessionId,
      credential: state.credential || null,
      showy_token: state.showyToken || null,
      platform: platformName(),
      app_version: String(
        (Lampa.Manifest &&
          (Lampa.Manifest.app_version || Lampa.Manifest.app_digital)) ||
          "",
      ),
      country_code: String(state.options.countryCode || "")
        .slice(0, 2)
        .toUpperCase(),
      context: {
        component: state.options.component || "",
        client_kind: clientKind(),
        lampa_device_id: lampaDeviceId(),
      },
    };
    if (content) payload.context.content = content;
    if (securityV2()) {
      var security = securityIdentityPayload();
      payload.installation_id = security.installation_id;
      payload.fingerprint = security.fingerprint;
    }
    return payload;
  }

  function handleSessionResult(result, generation) {
    if (generation !== state.sessionGeneration) return;
    if (result.credential) {
      state.credential = result.credential;
      storageSet("showy_marketing_credential", result.credential);
    }
    publishOfferBanner(
      result.offer_banner || null,
      result.card || null,
      result.pro || null,
    );
    submitContentOpen(generation, 0);
    applyProActivation(
      result.pro || { active: false },
      { dispatch: false },
      function (access) {
        var accountActive = !!(
          result.pro &&
          (result.pro.account_active || result.pro.active)
        );
        var freshTrialOffer = !accountActive && cardOffersTrial(result.card);
        var paidOffer = !accountActive && paidCardButton(result.card);
        if (freshTrialOffer) clearPluginTrialPrompt();
        var postTrialDue =
          !freshTrialOffer &&
          !paidOffer &&
          !accountActive &&
          pluginTrialPromptDue();
        if (access.changed && isFreeComponent(activeActivityComponent()))
          refreshActivity();
        if (postTrialDue) {
          state.card = null;
          state.cardPresented = false;
          setTimeout(function () {
            if (
              generation !== state.sessionGeneration ||
              !currentComponentIsActive()
            )
              return;
            maybeShowPostTrialPrompt("", function (shown) {
              if (
                !shown &&
                result.card &&
                !suppressSubscriptionCard(result.card)
              ) {
                state.card = result.card;
                state.cardPresented = false;
                showCard(result.card);
              }
            });
          }, 1200);
        } else if (result.card && !suppressSubscriptionCard(result.card)) {
          state.card = result.card;
          state.cardPresented = false;
          setTimeout(function () {
            if (generation === state.sessionGeneration) showCard(result.card);
          }, 1200);
        }
        var segment = result.profile && result.profile.segment;
        if (
          !postTrialDue &&
          /^(forgetful_whale|one_and_done|fresh_lapsed|tier_c)$/.test(
            String(segment || ""),
          )
        ) {
          setTimeout(function () {
            context("return_lapsed", {});
          }, 300);
        }
        if (result.pro && result.pro.active && result.pro.expiration) {
          var expirationAt = new Date(result.pro.expiration).getTime();
          var remainingMs = expirationAt - new Date().getTime();
          if (remainingMs > 0 && remainingMs <= 7 * 24 * 60 * 60 * 1000) {
            setTimeout(function () {
              context("subscription_expiring", {
                expiration_date: result.pro.expiration,
              });
            }, 300);
          }
        }
      },
    );
  }

  function handleSessionFailure(
    error,
    status,
    retriedWithoutCredential,
    generation,
  ) {
    if (generation !== state.sessionGeneration) return;
    if (!status || status >= 500) {
      applyCachedOfflineAccess(function (access) {
        if (access.changed && isFreeComponent(activeActivityComponent()))
          refreshActivity();
      });
      return;
    }
    if (
      state.credential &&
      !retriedWithoutCredential &&
      status >= 400 &&
      status < 500
    ) {
      state.credential = "";
      storageSet("showy_marketing_credential", "");
      registerSession(true, generation);
      return;
    }
    if (status === 401 || status === 403) {
      clearOfflineAccess();
      applyProActivation(
        { active: false },
        { serverVerified: true, dispatch: false, authoritative: true },
      );
      return;
    }
    var detail = String((error && error.detail) || "").toLowerCase();
    var invalidShowyToken =
      detail === "invalid showy token" || detail === "showy token not found";
    if (
      !state.credential &&
      state.showyToken &&
      !retriedWithoutCredential &&
      invalidShowyToken
    ) {
      state.showyToken = "";
      lampaStorageSet("showy_token", "");
      setInlineSource(false, "", false);
      registerSession(true, generation);
    }
  }

  function sendSession(payload, retriedWithoutCredential, generation) {
    request(
      securityV2() ? "/marketing/v2/session" : "/marketing/v1/session",
      payload,
      function (result) {
        handleSessionResult(result, generation);
      },
      function (error, status) {
        handleSessionFailure(
          error,
          status,
          retriedWithoutCredential,
          generation,
        );
      },
    );
  }

  function registerSession(retriedWithoutCredential, generation) {
    generation = generation || state.sessionGeneration;
    var payload = sessionPayload();
    if (!securityV2() || payload.credential || payload.showy_token) {
      sendSession(payload, retriedWithoutCredential, generation);
      return;
    }
    request(
      "/marketing/v2/challenge",
      {
        installation_id: payload.installation_id,
        fingerprint: payload.fingerprint,
      },
      function (challenge) {
        if (generation !== state.sessionGeneration) return;
        solveChallenge(
          challenge.challenge,
          challenge.difficulty,
          function (proof) {
            if (generation !== state.sessionGeneration) return;
            payload.challenge = challenge.challenge;
            payload.proof = proof;
            sendSession(payload, retriedWithoutCredential, generation);
          },
          function () {
            notify("Не удалось проверить устройство");
          },
        );
      },
      function () {
        notify("Регистрация устройства временно недоступна");
      },
    );
  }

  function start(options) {
    options = options || {};
    var component = String(options.component || "");
    if (!component || !normalizeBase(options.apiBase)) return;
    rememberComponent(component);
    state.componentOptions[component] = options;
    state.started = true;
    bindActivityScope();
    syncActivityScope();
  }

  function context(name, payload) {
    var supported = {
      "4k": true,
      slow_source: true,
      missing_source: true,
      vpn_limit: true,
      sport: true,
      subscription_expiring: true,
      return_lapsed: true,
    };
    name = String(name || "");
    if (!state.started || !supported[name]) return;
    if (!currentComponentIsActive()) return;
    if (state.postTrialPromptPending || state.postTrialPromptShown) return;
    if (state.contexts[name]) return;
    state.contexts[name] = true;
    var identity = identityPayload();
    request(
      "/marketing/v1/events",
      {
        event_id: uid("ctx-" + name),
        event_type: "ctx_" + name,
        credential: identity.credential,
        showy_token: identity.showy_token,
        payload: payload || {},
      },
      function (result) {
        if (
          !result.touch_id ||
          state.card ||
          state.postTrialPromptPending ||
          state.postTrialPromptShown
        )
          return;
        request(
          "/marketing/v1/feed",
          {
            session_id: state.sessionId,
            credential: identity.credential,
            showy_token: identity.showy_token,
            context: payload || {},
          },
          function (result) {
            var card = result && result.card;
            if (
              !card ||
              state.card ||
              state.postTrialPromptPending ||
              state.postTrialPromptShown ||
              suppressSubscriptionCard(card)
            )
              return;
            state.card = card;
            showCard(card);
          },
        );
      },
    );
  }

  window.addEventListener("showy:marketing-context", function (event) {
    var detail = (event && event.detail) || {};
    context(detail.name || detail.context, detail.payload || {});
  });

  window.ShowyMarketingRuntime = {
    start: start,
    context: context,
    createWtchInvoice: createWtchInvoice,
    registerSourceAdapter: registerSourceAdapter,
    sourceBase: sourceBase,
    rewriteSourceUrl: rewriteSourceUrl,
    ensureInlinePro: function (pro, success) {
      applyProActivation(pro || {}, { forceProbe: true }, success);
    },
    isInlineProActive: function () {
      return !!(state.proActive && state.inlineSourceBase);
    },
  };
})(window);

(function (window) {
  "use strict";

  if (window.ShowyProEntryBanner) return;

  var STYLE_ID = "showy-pro-entry-banner-style";
  var DEFAULT_API_BASE = "http://87.120.126.125:8001";
  var DEFAULT_PRO_URL = "https://t.me/showybot?start=info";
  var VARIANT_KEY = "showy_pro_entry_banner_variant";
  var instances = [];
  var activityScopeBound = false;
  var activeOffer = null;
  var offerRevision = 0;

  function notifyActivityChanged() {
    var current = instances.slice(0);
    var index;
    for (index = 0; index < current.length; index += 1) {
      try {
        current[index].ensure();
      } catch (e) {}
    }
  }

  function bindActivityScope() {
    if (activityScopeBound) return;
    activityScopeBound = true;
    try {
      if (
        Lampa.Storage &&
        Lampa.Storage.listener &&
        Lampa.Storage.listener.follow
      ) {
        Lampa.Storage.listener.follow("change", function (event) {
          if (event && event.name === "activity")
            setTimeout(notifyActivityChanged, 0);
        });
      }
    } catch (e) {}
  }

  function validOffer(value) {
    var url;
    var expiration;
    var directSbp;
    var paymentOnly;
    if (!value) return null;
    url = String(value.url || "");
    paymentOnly = value.payment_only === true;
    directSbp =
      String(value.payment_mode || "") === "sbp" &&
      /^(liontech|wata)$/.test(String(value.provider || "")) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value.checkout_id || ""),
      );
    if (!value.offer_grant_id && !paymentOnly) return null;
    if (
      !/^https:\/\/t\.me\/[a-z0-9_]+\?start=(?:p_|wtchpay_)[a-z0-9_-]+$/i.test(
        url,
      ) &&
      !(directSbp && /^https:\/\/[^\s]+$/i.test(url))
    )
      return null;
    expiration = new Date(String(value.valid_until || "")).getTime();
    if (!expiration || expiration <= new Date().getTime()) return null;
    return {
      offer_code: String(value.offer_code || "personal"),
      offer_grant_id: String(value.offer_grant_id),
      title: String(value.title || "Персональное предложение"),
      text: String(value.text || "")
        .replace(/\s+/g, " ")
        .trim(),
      offer_description: String(value.offer_description || "")
        .replace(/\s+/g, " ")
        .trim(),
      valid_until: String(value.valid_until || ""),
      url: url,
      payment_mode: directSbp ? "sbp" : "telegram",
      provider: directSbp ? String(value.provider) : "",
      checkout_id: directSbp ? String(value.checkout_id) : "",
      amount: directSbp ? String(value.amount || "") : "",
      currency: directSbp ? String(value.currency || "") : "",
      payment_only: paymentOnly,
    };
  }

  try {
    window.addEventListener("showy:offer-banner", function (event) {
      activeOffer = validOffer(event && event.detail);
      offerRevision += 1;
      notifyActivityChanged();
    });
  } catch (e) {}

  function storageGet(key) {
    var value = "";
    try {
      value = window.localStorage.getItem(key) || "";
    } catch (e) {}
    if (value) return value;
    try {
      return Lampa.Storage.get(key, "") || "";
    } catch (ignored) {
      return "";
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
    try {
      Lampa.Storage.set(key, value);
    } catch (ignored) {}
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeBase(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function clientKind() {
    var ua = String((window.navigator && window.navigator.userAgent) || "");
    var screenWidth =
      window.innerWidth || (window.screen ? window.screen.width : 0);
    var screenHeight =
      window.innerHeight || (window.screen ? window.screen.height : 0);
    var screenMinSide =
      screenWidth && screenHeight
        ? Math.min(screenWidth, screenHeight)
        : screenWidth;
    var screenRatio = screenHeight ? screenWidth / screenHeight : 1;
    var hasTouch =
      "ontouchstart" in window ||
      (window.navigator && window.navigator.maxTouchPoints > 0) ||
      (window.navigator && window.navigator.msMaxTouchPoints > 0);
    if (
      /tizen|web0s|webos|smart-tv|smarttv|hbbtv|netcast|android[\s_-]*tv|tcl[\s_-]*tv|bravia|googletv|\baft[a-z0-9]+\b|\btv\b/i.test(
        ua,
      )
    )
      return "tv";
    if (/iphone|ipad|ipod|android[^;)]*mobile|\bmobile\b/i.test(ua))
      return "mobile";
    if (
      hasTouch &&
      (screenRatio < 1.6 || screenRatio > 2 || screenMinSide <= 500)
    )
      return "mobile";
    try {
      if (Lampa.Platform.is("tizen") || Lampa.Platform.is("webos")) return "tv";
      if (Lampa.Platform.is("android")) return "tv";
    } catch (e) {}
    return "desktop";
  }

  function randomInstallationId() {
    var bytes;
    var output = "";
    var index;
    try {
      bytes = new Uint8Array(24);
      window.crypto.getRandomValues(bytes);
      for (index = 0; index < bytes.length; index += 1) {
        output += ("0" + bytes[index].toString(16)).slice(-2);
      }
      return output;
    } catch (e) {
      return (
        "banner" +
        new Date().getTime().toString(36) +
        Math.random().toString(36).slice(2)
      )
        .replace(/[^A-Za-z0-9_-]/g, "")
        .slice(0, 96);
    }
  }

  function installationId() {
    var value = String(storageGet("showy_marketing_installation_id") || "");
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(value)) value = randomInstallationId();
    storageSet("showy_marketing_installation_id", value);
    return value;
  }

  function deviceFingerprint() {
    var screenWidth = Number((window.screen && window.screen.width) || 0);
    var screenHeight = Number((window.screen && window.screen.height) || 0);
    var dimensions = [screenWidth, screenHeight].sort(function (a, b) {
      return a - b;
    });
    var timezone = "";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (e) {}
    return [
      String((window.navigator && window.navigator.userAgent) || ""),
      String((window.navigator && window.navigator.platform) || ""),
      String((window.navigator && window.navigator.language) || ""),
      String((window.navigator && window.navigator.hardwareConcurrency) || ""),
      String((window.navigator && window.navigator.deviceMemory) || ""),
      dimensions.join("x"),
      String((window.screen && window.screen.colorDepth) || ""),
      timezone,
      String(storageGet("lampac_unic_id") || ""),
      clientKind(),
    ]
      .join("|")
      .slice(0, 1024);
  }

  function offlinePayload() {
    var payload;
    var currentToken = String(storageGet("showy_token") || "");
    try {
      payload = JSON.parse(storageGet("showy_offline_pro_payload") || "{}");
    } catch (e) {
      return null;
    }
    if (!payload || !payload.active) return null;
    if (!currentToken || currentToken !== String(payload.showy_token || ""))
      return null;
    if (!/^(trial|paid|grace)$/.test(String(payload.access_kind || "")))
      return null;
    if (new Date(payload.expiration || "").getTime() <= new Date().getTime())
      return null;
    if (
      new Date(payload.access_ticket_expires_at || "").getTime() <=
      new Date().getTime()
    )
      return null;
    return payload;
  }

  function identityPayload() {
    var cached = offlinePayload() || {};
    return {
      credential:
        String(storageGet("showy_marketing_credential") || "") || null,
      showy_token:
        String(storageGet("showy_token") || cached.showy_token || "") || null,
    };
  }

  function nextVariant() {
    var previous = parseInt(storageGet(VARIANT_KEY), 10);
    var next = isNaN(previous) ? 0 : (previous + 1) % 4;
    storageSet(VARIANT_KEY, String(next));
    return next;
  }

  function lampaCardQuality(movie) {
    var value;
    if (!movie || movie.first_air_date || movie.original_name) return "";
    value = movie.quality;
    if (typeof value !== "string" && typeof value !== "number")
      value = movie.release_quality;
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : "";
  }

  function isFourKQuality(value) {
    var normalized = String(value || "")
      .toUpperCase()
      .replace(/\s+/g, "");
    return (
      normalized.indexOf("4K") >= 0 ||
      normalized.indexOf("UHD") >= 0 ||
      normalized.indexOf("2160") >= 0
    );
  }

  function isTwoKQuality(value) {
    var normalized = String(value || "")
      .toUpperCase()
      .replace(/\s+/g, "");
    return (
      normalized.indexOf("2K") >= 0 ||
      normalized.indexOf("QHD") >= 0 ||
      normalized.indexOf("1440") >= 0
    );
  }

  function catalogQuality(hasTwoK) {
    return (
      (hasTwoK ? "Здесь доступно 2K. " : "") +
      "Большинство фильмов в Showy PRO доступно в 4K"
    );
  }

  function campaignFor(variant, hasFourK, hasTwoK, title) {
    var campaign = variant;
    if (campaign === 0 && !hasFourK) {
      if (hasTwoK) {
        return {
          id: "quality-2k",
          title: "«" + title + "»: смотришь в 720p, а можешь в 2K",
          benefit:
            "Здесь доступно 2K на выделенных серверах. Большинство фильмов в Showy PRO доступно в 4K",
          current: "сейчас: 720p",
          pro: "с PRO: 2K без буферизации",
        };
      }
      return {
        id: "max-quality",
        title:
          "Не хватает качества в «" + title + "»? Showy PRO найдёт максимум",
        benefit:
          "Showy PRO покажет фильм в максимальном доступном качестве на выделенных серверах. " +
          catalogQuality(false),
        current: "сейчас: бесплатные источники",
        pro: "с PRO: максимум качества и скорости",
      };
    }
    if (campaign === 0) {
      return {
        id: "quality",
        title: "«" + title + "»: ты смотришь в 720p, а можешь в 4K",
        benefit:
          "Filmix 4K и Alloha на выделенных серверах, без тормозов даже вечером",
        current: "сейчас: 720p",
        pro: "с PRO: 4K HDR",
      };
    }
    if (campaign === 1) {
      return {
        id: "speed",
        title: "«" + title + "» тормозит вечером? С Showy PRO - плавно",
        benefit:
          "Выделенные серверы Showy PRO держат стабильную скорость вечером. " +
          (hasFourK
            ? "Для открытого фильма доступно 4K"
            : catalogQuality(hasTwoK)),
        current: hasFourK
          ? "сейчас: 720p"
          : "обычные серверы: скорость меняется",
        pro: hasFourK
          ? "с PRO: 4K HDR без тормозов"
          : "с PRO: плавный просмотр",
      };
    }
    if (campaign === 2) {
      return {
        id: "torrent",
        title: "Ищешь торрент для «" + title + "»? С ShowyTOR - один клик",
        benefit:
          "ShowyTOR запускает торрент из карточки фильма в один клик: настраивать TorrServer не нужно. " +
          (hasFourK
            ? "Для открытого фильма доступно 4K"
            : catalogQuality(hasTwoK)),
        current: hasFourK ? "сейчас: 720p" : "обычно: искать и настраивать",
        pro: hasFourK
          ? "с PRO: 4K и торрент в один клик"
          : "с PRO: торрент в один клик",
      };
    }
    if (hasFourK) {
      return {
        id: "combined-4k",
        title: "720p и тормоза? «" + title + "» в Showy PRO - 4K без пауз",
        benefit:
          "Filmix 4K, выделенные серверы и ShowyTOR без настройки TorrServer",
        current: "сейчас: 720p",
        pro: "с PRO: 4K HDR без тормозов",
      };
    }
    return {
      id: "combined",
      title:
        "Мало источников или всё тормозит? «" +
        title +
        "» с Showy PRO смотреть проще" +
        (hasTwoK ? " в 2K" : ""),
      benefit:
        "Выделенные серверы Showy PRO и ShowyTOR без настройки TorrServer прямо в карточке. " +
        catalogQuality(hasTwoK),
      current: "сейчас: бесплатные источники",
      pro: "с PRO: скорость и торренты без настройки TorrServer",
    };
  }

  function qrUrl(value, size) {
    return (
      "https://api.qrserver.com/v1/create-qr-code/?size=" +
      size +
      "x" +
      size +
      "&data=" +
      encodeURIComponent(value)
    );
  }

  function offerDeadline(value) {
    var date = new Date(String(value || ""));
    var months = [
      "января",
      "февраля",
      "марта",
      "апреля",
      "мая",
      "июня",
      "июля",
      "августа",
      "сентября",
      "октября",
      "ноября",
      "декабря",
    ];
    if (isNaN(date.getTime())) return "ограниченное время";
    return date.getDate() + " " + months[date.getMonth()];
  }

  function introOfferCampaign(variant, offer, mobile) {
    var deadline = offerDeadline(offer.valid_until);
    var amountMatch = String(offer.offer_description || offer.text || "").match(
      /(?:за|всего)\s+([\d\s]+)\s*₽/i,
    );
    var amount = amountMatch
      ? amountMatch[1].replace(/\s+/g, " ").trim() + " ₽"
      : "499 ₽";
    var variants = [
      {
        title: "Плати за месяц - смотри три: Showy PRO за " + amount,
        benefit:
          "4K у большинства фильмов · выделенные серверы без тормозов · ShowyTOR без настройки TorrServer",
      },
      {
        title: "Три месяца плавного просмотра - " + amount,
        benefit:
          "Стабильная скорость даже вечером · 4K у большинства фильмов · торренты прямо из карточки",
      },
      {
        title: "Больше качества на три месяца - " + amount,
        benefit:
          "Filmix 4K, Alloha и NeNetflix · быстрые серверы · ShowyTOR без настройки TorrServer",
      },
      {
        title: "ShowyTOR, быстрые серверы и 4K - 3 месяца за " + amount,
        benefit:
          "ShowyTOR запускает торрент из карточки без поиска и настройки TorrServer · плавный просмотр вечером",
      },
    ];
    var selected = variants[variant] || variants[0];
    selected.benefit += " · IPTV, VPN и устройства - по обычной цене";
    return {
      id: "offer-" + offer.offer_code,
      title: selected.title,
      benefit: selected.benefit,
      current: "действует до " + deadline,
      pro: mobile ? "открой ссылку ниже" : "обязательно отсканируй QR",
    };
  }

  function addStyles() {
    var style;
    if (document.getElementById(STYLE_ID)) return;
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.type = "text/css";
    style.innerHTML =
      ".showy-pro-entry-banner{box-sizing:border-box;position:relative;display:-webkit-box;display:-webkit-flex;display:flex;width:auto;min-width:0;min-height:190px;margin:0 -.6em 1.6em;padding:17px 18px;border:2px solid #2bd49a;border-radius:6px;background:#15191d;color:#fff;overflow:hidden;}" +
      ".online-prestige-watched+.showy-pro-entry-banner{margin-top:1.6em;}" +
      ".showy-pro-entry-banner__content{min-width:0;-webkit-box-flex:1;-webkit-flex:1 1 auto;flex:1 1 auto;padding-right:18px;-webkit-align-self:center;align-self:center;}" +
      ".showy-pro-entry-banner__meta{display:-webkit-box;display:-webkit-flex;display:flex;-webkit-box-align:center;-webkit-align-items:center;align-items:center;min-width:0;margin-bottom:10px;}" +
      ".showy-pro-entry-banner__tag{display:inline-block;flex:0 0 auto;padding:6px 11px;border-radius:5px;background:#20ba83;color:#071510;font-size:15px;font-weight:800;line-height:1;}" +
      ".showy-pro-entry-banner__title{max-width:1100px;margin:0 0 8px;font-size:25px;font-weight:700;line-height:1.22;overflow-wrap:anywhere;}" +
      ".showy-pro-entry-banner__benefit{max-width:1100px;margin:0 0 11px;color:#cbd4da;font-size:15px;line-height:1.3;overflow-wrap:anywhere;}" +
      ".showy-pro-entry-banner__compare{display:-webkit-box;display:-webkit-flex;display:flex;-webkit-box-align:center;-webkit-align-items:center;align-items:center;-webkit-flex-wrap:wrap;flex-wrap:wrap;margin:0 0 1px;}" +
      ".showy-pro-entry-banner__chip{display:inline-block;margin:0 8px 8px 0;padding:7px 10px;border-radius:5px;background:#30363d;color:#d4dbe0;font-size:15px;line-height:1.2;}" +
      ".showy-pro-entry-banner__chip--pro{background:#174c3b;color:#8ff0c9;}" +
      ".showy-pro-entry-banner__arrow{margin:0 8px 8px 0;color:#2bd49a;font-size:24px;line-height:1;}" +
      ".showy-pro-entry-banner__mobile-link{display:none;padding:2px 0 1px;color:#8ff0c9;font-size:13px;line-height:1.25;}" +
      ".showy-pro-entry-banner__qr-wrap{width:152px;-webkit-flex:0 0 152px;flex:0 0 152px;text-align:center;-webkit-align-self:center;align-self:center;}" +
      ".showy-pro-entry-banner__qr{display:block;width:140px;height:140px;margin:0 auto;padding:5px;box-sizing:border-box;border-radius:4px;background:#fff;object-fit:contain;}" +
      ".showy-pro-entry-banner--ocean{border-color:#45bfea;background:#141a20;}" +
      ".showy-pro-entry-banner--ocean .showy-pro-entry-banner__tag{background:#45bfea;color:#061218;}" +
      ".showy-pro-entry-banner--ocean .showy-pro-entry-banner__chip--pro{background:#174457;color:#9ae3ff;}" +
      ".showy-pro-entry-banner--ocean .showy-pro-entry-banner__arrow{color:#45bfea;}" +
      ".showy-pro-entry-banner--coral{border-color:#f06b9f;background:#1d171b;}" +
      ".showy-pro-entry-banner--coral .showy-pro-entry-banner__tag{background:#f06b9f;color:#1b0710;}" +
      ".showy-pro-entry-banner--coral .showy-pro-entry-banner__chip--pro{background:#572038;color:#ffc0d8;}" +
      ".showy-pro-entry-banner--coral .showy-pro-entry-banner__arrow{color:#f06b9f;}" +
      ".showy-pro-entry-banner--amber{border-color:#f2b84b;background:#1d1a14;}" +
      ".showy-pro-entry-banner--amber .showy-pro-entry-banner__tag{background:#f2b84b;color:#1a1102;}" +
      ".showy-pro-entry-banner--amber .showy-pro-entry-banner__chip--pro{background:#544019;color:#ffe0a0;}" +
      ".showy-pro-entry-banner--amber .showy-pro-entry-banner__arrow{color:#f2b84b;}" +
      ".showy-pro-entry-banner--client-tv{min-height:138px;padding:9px 11px;}" +
      ".showy-pro-entry-banner--client-tv .showy-pro-entry-banner__content{padding-right:10px;}" +
      ".showy-pro-entry-banner--client-tv .showy-pro-entry-banner__meta{margin-bottom:4px;}" +
      ".showy-pro-entry-banner--client-tv .showy-pro-entry-banner__tag{font-size:11px;padding:4px 7px;}" +
      ".showy-pro-entry-banner--client-tv .showy-pro-entry-banner__title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;max-height:2.4em;overflow:hidden;font-size:18px;line-height:1.2;margin-bottom:4px;}" +
      ".showy-pro-entry-banner--client-tv .showy-pro-entry-banner__benefit{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;max-width:none;max-height:2.4em;overflow:hidden;white-space:normal;font-size:11px;line-height:1.2;margin-bottom:4px;}" +
      ".showy-pro-entry-banner--client-tv .showy-pro-entry-banner__chip{font-size:11px;padding:4px 6px;margin:0 5px 3px 0;}" +
      ".showy-pro-entry-banner--client-tv .showy-pro-entry-banner__arrow{font-size:16px;margin:0 5px 3px 0;}" +
      ".showy-pro-entry-banner--client-tv .showy-pro-entry-banner__qr-wrap{width:100px;-webkit-flex-basis:100px;flex-basis:100px;}" +
      ".showy-pro-entry-banner--client-tv .showy-pro-entry-banner__qr{width:92px;height:92px;padding:3px;}" +
      ".showy-pro-entry-banner--client-mobile{min-height:0;}" +
      ".showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__content{padding-right:0;}" +
      ".showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__qr-wrap{display:none;}" +
      ".showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__mobile-link{display:block;}" +
      ".showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__benefit{display:none;}" +
      ".showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__title{font-size:20px;}" +
      ".showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__tag{font-size:13px;padding:5px 8px;}" +
      ".showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__chip{font-size:14px;padding:6px 8px;}" +
      ".showy-pro-entry-banner--ocean .showy-pro-entry-banner__mobile-link{color:#9ae3ff;}" +
      ".showy-pro-entry-banner--coral .showy-pro-entry-banner__mobile-link{color:#ffc0d8;}" +
      ".showy-pro-entry-banner--amber .showy-pro-entry-banner__mobile-link{color:#ffe0a0;}" +
      "@media(max-width:1100px){.showy-pro-entry-banner:not(.showy-pro-entry-banner--client-mobile):not(.showy-pro-entry-banner--client-tv){min-height:176px;padding:14px 15px}.showy-pro-entry-banner:not(.showy-pro-entry-banner--client-mobile):not(.showy-pro-entry-banner--client-tv) .showy-pro-entry-banner__title{font-size:22px}.showy-pro-entry-banner:not(.showy-pro-entry-banner--client-mobile):not(.showy-pro-entry-banner--client-tv) .showy-pro-entry-banner__benefit{font-size:14px;margin-bottom:8px}.showy-pro-entry-banner:not(.showy-pro-entry-banner--client-mobile):not(.showy-pro-entry-banner--client-tv) .showy-pro-entry-banner__chip{font-size:14px;padding:6px 8px}.showy-pro-entry-banner:not(.showy-pro-entry-banner--client-mobile):not(.showy-pro-entry-banner--client-tv) .showy-pro-entry-banner__qr-wrap{width:136px;-webkit-flex-basis:136px;flex-basis:136px}.showy-pro-entry-banner:not(.showy-pro-entry-banner--client-mobile):not(.showy-pro-entry-banner--client-tv) .showy-pro-entry-banner__qr{width:126px;height:126px}.showy-pro-entry-banner--client-tv{min-height:122px;padding:7px 9px}.showy-pro-entry-banner--client-tv .showy-pro-entry-banner__content{padding-right:8px}.showy-pro-entry-banner--client-tv .showy-pro-entry-banner__meta{margin-bottom:3px}.showy-pro-entry-banner--client-tv .showy-pro-entry-banner__tag{font-size:10px;padding:3px 6px}.showy-pro-entry-banner--client-tv .showy-pro-entry-banner__title{font-size:15px;line-height:1.18;margin-bottom:3px}.showy-pro-entry-banner--client-tv .showy-pro-entry-banner__benefit{font-size:10px;line-height:1.15;margin-bottom:3px}.showy-pro-entry-banner--client-tv .showy-pro-entry-banner__chip{font-size:10px;padding:3px 5px;margin:0 4px 2px 0}.showy-pro-entry-banner--client-tv .showy-pro-entry-banner__arrow{font-size:14px;margin:0 4px 2px 0}.showy-pro-entry-banner--client-tv .showy-pro-entry-banner__qr-wrap{width:82px;-webkit-flex-basis:82px;flex-basis:82px}.showy-pro-entry-banner--client-tv .showy-pro-entry-banner__qr{width:76px;height:76px;padding:2px}}" +
      "@media(max-width:760px){.showy-pro-entry-banner{min-height:0;padding:11px 12px}.showy-pro-entry-banner__title,.showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__title{font-size:17px;margin-bottom:7px}.showy-pro-entry-banner__meta{margin-bottom:7px}.showy-pro-entry-banner__tag,.showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__tag{font-size:12px;padding:4px 7px}.showy-pro-entry-banner__compare{margin-bottom:1px}.showy-pro-entry-banner__chip,.showy-pro-entry-banner--client-mobile .showy-pro-entry-banner__chip{margin:0 5px 5px 0;font-size:13px;padding:5px 7px}.showy-pro-entry-banner__arrow{margin:0 5px 5px 0;font-size:18px}}";
    document.head.appendChild(style);
  }

  function activeActivityMatches(component, activity, ownedRoot) {
    var active;
    var activeRoot;
    try {
      active =
        Lampa.Activity && Lampa.Activity.active
          ? Lampa.Activity.active()
          : null;
      if (
        !active ||
        active.component !== component ||
        (activity && active.activity !== activity)
      )
        return false;
      if (ownedRoot && active.activity && active.activity.render) {
        activeRoot = active.activity.render();
        activeRoot = activeRoot && activeRoot[0];
        if (
          !activeRoot ||
          (activeRoot !== ownedRoot && !activeRoot.contains(ownedRoot))
        )
          return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function attach(options) {
    options = options || {};
    var component = String(options.component || "");
    var activity = options.activity || null;
    var scroll = options.scroll;
    var apiBase = normalizeBase(options.apiBase || DEFAULT_API_BASE);
    var proUrl = String(options.proUrl || DEFAULT_PRO_URL);
    var movie = options.movie || {};
    var owner = String(options.owner || component || "showy-free");
    var destroyed = false;
    var mounted = false;
    var eligible = false;
    var resolved = false;
    var banner = null;
    var observer = null;
    var ensureTimer = null;
    var request = null;
    var verifyRetry = 0;
    var variant = null;
    var controller = null;
    var resolvedIdentityKey = "";
    var renderedOfferRevision = -1;

    function rootNode() {
      try {
        return scroll && scroll.body ? scroll.body() : null;
      } catch (e) {
        return null;
      }
    }

    function isActive() {
      var root = rootNode();
      return activeActivityMatches(
        component,
        activity,
        root && root.length ? root[0] : null,
      );
    }

    function removeBanner() {
      if (banner) {
        try {
          banner.off();
          banner.remove();
        } catch (e) {}
      }
      banner = null;
    }

    function bannerMarkup(variant) {
      var title = String(
        movie.title || movie.name || movie.original_title || "Этот фильм",
      );
      var kind = clientKind();
      var mobile = kind === "mobile";
      var tv = kind === "tv";
      var quality = lampaCardQuality(movie);
      var hasFourK = isFourKQuality(quality);
      var hasTwoK = isTwoKQuality(quality);
      var palettes = ["emerald", "ocean", "coral", "amber"];
      var palette = palettes[variant] || palettes[0];
      var selected = campaignFor(variant, hasFourK, hasTwoK, title);
      var offer = validOffer(activeOffer);
      var targetUrl = proUrl;
      var tag = "SHOWY PRO";
      if (offer) {
        targetUrl = offer.url;
        if (!offer.payment_only) {
          tag = "SHOWY PRO · ПЕРСОНАЛЬНО";
          selected =
            offer.offer_code === "intro_3m"
              ? introOfferCampaign(variant, offer, mobile)
              : {
                  id: "offer-" + offer.offer_code,
                  title: offer.title,
                  benefit: offer.text || offer.offer_description,
                  current: "действует до " + offerDeadline(offer.valid_until),
                  pro: mobile
                    ? "открой ссылку ниже"
                    : "обязательно отсканируй QR",
                };
          if (offer.offer_code === "ragged_12m") {
            selected.benefit += " · IPTV, VPN и устройства - по обычной цене";
          } else if (offer.offer_code === "weekend") {
            selected.benefit += " · IPTV, VPN и устройства не входят";
          }
        }
      }
      var paletteClass =
        palette === "emerald" ? "" : " showy-pro-entry-banner--" + palette;
      return (
        '<div class="showy-pro-entry-banner' +
        paletteClass +
        (mobile ? " showy-pro-entry-banner--client-mobile" : "") +
        (tv ? " showy-pro-entry-banner--client-tv" : "") +
        '" data-owner="' +
        escapeHtml(owner) +
        '" data-variant="' +
        variant +
        '" data-campaign="' +
        selected.id +
        '" data-lampa-quality="' +
        escapeHtml(quality) +
        '">' +
        '<div class="showy-pro-entry-banner__content">' +
        '<div class="showy-pro-entry-banner__meta"><span class="showy-pro-entry-banner__tag">' +
        escapeHtml(tag) +
        "</span></div>" +
        '<div class="showy-pro-entry-banner__title">' +
        escapeHtml(selected.title) +
        "</div>" +
        '<div class="showy-pro-entry-banner__benefit">' +
        escapeHtml(selected.benefit) +
        "</div>" +
        '<div class="showy-pro-entry-banner__compare">' +
        '<span class="showy-pro-entry-banner__chip">' +
        escapeHtml(selected.current) +
        "</span>" +
        '<span class="showy-pro-entry-banner__arrow">→</span>' +
        '<span class="showy-pro-entry-banner__chip showy-pro-entry-banner__chip--pro">' +
        escapeHtml(selected.pro) +
        "</span>" +
        "</div>" +
        '<div class="showy-pro-entry-banner__mobile-link">' +
        escapeHtml(targetUrl.replace(/^https:\/\//, "")) +
        "</div>" +
        "</div>" +
        '<div class="showy-pro-entry-banner__qr-wrap">' +
        '<img class="showy-pro-entry-banner__qr" src="' +
        escapeHtml(qrUrl(targetUrl, 180)) +
        '" alt="QR">' +
        "</div>" +
        "</div>"
      );
    }

    function stopWatching() {
      if (request && request.abort) {
        try {
          request.abort();
        } catch (e) {}
      }
      request = null;
      if (observer) observer.disconnect();
      observer = null;
      if (ensureTimer) clearInterval(ensureTimer);
      ensureTimer = null;
      resolved = false;
      eligible = false;
      verifyRetry = 0;
      removeBanner();
    }

    function startWatching() {
      var root;
      if (destroyed || !mounted || !isActive()) return;
      root = rootNode();
      if (!observer && root && root.length && window.MutationObserver) {
        observer = new MutationObserver(function () {
          ensureBanner();
        });
        try {
          observer.observe(root[0], { childList: true });
        } catch (e) {
          observer = null;
        }
      }
      if (!ensureTimer) ensureTimer = setInterval(ensureBanner, 800);
    }

    function ensureBanner() {
      var root;
      var existing;
      var currentIdentity;
      var currentIdentityKey;
      if (destroyed || !mounted) {
        removeBanner();
        return;
      }
      if (!isActive()) {
        stopWatching();
        return;
      }
      startWatching();
      if (offlinePayload()) {
        resolveAsSubscriber();
        return;
      }
      currentIdentity = identityPayload();
      currentIdentityKey =
        String(currentIdentity.credential || "") +
        "|" +
        String(currentIdentity.showy_token || "");
      if (resolved && eligible && currentIdentityKey !== resolvedIdentityKey) {
        resolved = false;
        eligible = false;
        verifyRetry = 0;
        removeBanner();
      }
      if (!resolved) {
        if (!request) resolveAccess();
        return;
      }
      if (!eligible) {
        removeBanner();
        return;
      }
      root = rootNode();
      if (!root || !root.length) return;
      existing = root.children(
        '.showy-pro-entry-banner[data-owner="' + owner.replace(/"/g, "") + '"]',
      );
      if (existing.length && renderedOfferRevision !== offerRevision) {
        removeBanner();
        existing = root.children(
          '.showy-pro-entry-banner[data-owner="' +
            owner.replace(/"/g, "") +
            '"]',
        );
      }
      if (existing.length) {
        banner = existing.eq(0);
        placeBanner(root, banner);
        return;
      }
      if (variant === null) variant = nextVariant();
      banner = $(bannerMarkup(variant));
      renderedOfferRevision = offerRevision;
      placeBanner(root, banner);
    }

    function placeBanner(root, currentBanner) {
      var history = root.children(".online-prestige-watched").eq(0);
      if (history.length) {
        if (currentBanner.prev()[0] !== history[0])
          currentBanner.insertAfter(history);
      } else if (root.children().eq(0)[0] !== currentBanner[0]) {
        root.prepend(currentBanner);
      }
    }

    function resolveAsFree() {
      resolved = true;
      eligible = true;
      ensureBanner();
    }

    function resolveAsSubscriber() {
      resolved = true;
      eligible = false;
      removeBanner();
    }

    function verifyAccess(identity) {
      if (destroyed || !mounted || !isActive()) return;
      if (!identity.credential && !identity.showy_token) {
        resolveAsFree();
        return;
      }
      try {
        request = $.ajax({
          url: apiBase + "/marketing/v2/access/verify",
          type: "POST",
          data: JSON.stringify({
            installation_id: installationId(),
            fingerprint: deviceFingerprint(),
            credential: identity.credential,
            showy_token: identity.showy_token,
          }),
          contentType: "application/json",
          dataType: "json",
          timeout: 7000,
          success: function (result) {
            var pro;
            request = null;
            if (destroyed || !mounted || !isActive()) return;
            pro =
              result && result.security && result.security.verified === true
                ? result.pro
                : null;
            if (!pro) {
              resolveAsSubscriber();
              return;
            }
            if (pro.active) resolveAsSubscriber();
            else resolveAsFree();
          },
          error: function (xhr) {
            var nextIdentity;
            request = null;
            if (destroyed || !mounted || !isActive()) return;
            nextIdentity = identityPayload();
            if (
              xhr &&
              (xhr.status === 401 || xhr.status === 403) &&
              verifyRetry < 2 &&
              (nextIdentity.credential !== identity.credential ||
                nextIdentity.showy_token !== identity.showy_token)
            ) {
              verifyRetry += 1;
              setTimeout(function () {
                verifyAccess(nextIdentity);
              }, 500);
              return;
            }
            if (offlinePayload()) {
              resolveAsSubscriber();
            } else {
              resolveAsFree();
            }
          },
        });
      } catch (e) {
        if (offlinePayload()) resolveAsSubscriber();
        else resolveAsFree();
      }
    }

    function resolveAccess() {
      var cached;
      var identity;
      if (destroyed || !mounted || !isActive()) return;
      cached = offlinePayload();
      if (cached) {
        resolveAsSubscriber();
        return;
      }
      identity = identityPayload();
      resolvedIdentityKey =
        String(identity.credential || "") +
        "|" +
        String(identity.showy_token || "");
      if (identity.credential || identity.showy_token) {
        verifyAccess(identity);
        return;
      }
      resolveAsFree();
    }

    function mount() {
      if (destroyed || mounted) return;
      mounted = true;
      addStyles();
      ensureBanner();
    }

    function destroy() {
      var index;
      destroyed = true;
      stopWatching();
      mounted = false;
      index = instances.indexOf(controller);
      if (index >= 0) instances.splice(index, 1);
    }

    controller = {
      mount: mount,
      destroy: destroy,
      ensure: ensureBanner,
    };
    instances.push(controller);
    bindActivityScope();
    return controller;
  }

  window.ShowyProEntryBanner = {
    attach: attach,
    version: "20260805-16",
  };
})(window);

(function () {
  "use strict";

  var smotret24InlineOriginalBase = "http://smotret24.ru";

  var Defined = {
    api: "lampac",
    localhost: smotret24InlineOriginalBase + "/",
    apn: "",
  };

  var balansers_with_search;

  function smotret24InlineStorageGet(key) {
    try {
      return window.localStorage.getItem(key) || "";
    } catch (e) {
      try {
        return Lampa.Storage.get(key, "") || "";
      } catch (ignored) {
        return "";
      }
    }
  }

  function smotret24InlineCachedBase() {
    if (smotret24InlineStorageGet("showy_inline_pro_active") !== "1") return "";
    try {
      if (!Lampa.Storage.get("showy_token", "")) return "";
    } catch (e) {
      return "";
    }
    var base = String(
      smotret24InlineStorageGet("showy_inline_pro_source_base") || "",
    ).replace(/\/+$/, "");
    return base === "http://showypro.com" || base === "http://showy.pro"
      ? base
      : "";
  }

  function smotret24InlineSourceBase() {
    try {
      if (
        window.ShowyMarketingRuntime &&
        window.ShowyMarketingRuntime.sourceBase
      ) {
        return window.ShowyMarketingRuntime.sourceBase(
          smotret24InlineOriginalBase,
        );
      }
    } catch (e) {}
    return smotret24InlineCachedBase() || smotret24InlineOriginalBase;
  }

  function smotret24InlineSourceUrl(url) {
    url = String(url || "");
    try {
      if (
        window.ShowyMarketingRuntime &&
        window.ShowyMarketingRuntime.rewriteSourceUrl
      ) {
        return window.ShowyMarketingRuntime.rewriteSourceUrl(
          url,
          smotret24InlineOriginalBase,
        );
      }
    } catch (e) {}
    var selected = smotret24InlineSourceBase();
    if (
      selected !== smotret24InlineOriginalBase &&
      url.indexOf(smotret24InlineOriginalBase + "/") === 0
    ) {
      return selected + url.slice(smotret24InlineOriginalBase.length);
    }
    return url;
  }

  function smotret24InlineResetSourceState() {
    balansers_with_search = undefined;
    try {
      var client = window.nwsClient && window.nwsClient[hostkey];
      if (client) {
        client._shouldReconnect = false;
        if (client.socket && client.socket.close) client.socket.close();
        delete window.nwsClient[hostkey];
      }
    } catch (e) {}
    try {
      var rchState = window.rch_nws && window.rch_nws[hostkey];
      if (rchState) {
        rchState.startTypeInvoke = false;
        rchState.rchRegistry = false;
        rchState.connectionId = null;
      }
    } catch (e) {}
  }

  function smotret24InlineRegisterSourceAdapter() {
    if (
      !window.ShowyMarketingRuntime ||
      !window.ShowyMarketingRuntime.registerSourceAdapter
    )
      return;
    window.ShowyMarketingRuntime.registerSourceAdapter({
      id: "smotret24_ru:" + smotret24InlineOriginalBase,
      originalBase: smotret24InlineOriginalBase,
      onChange: smotret24InlineResetSourceState,
    });
  }

  var unic_id = Lampa.Storage.get("lampac_unic_id", "");
  if (!unic_id) {
    unic_id = Lampa.Utils.uid(8).toLowerCase();
    Lampa.Storage.set("lampac_unic_id", unic_id);
  }

  function getAndroidVersion() {
    if (Lampa.Platform.is("android")) {
      try {
        var current = AndroidJS.appVersion().split("-");
        return parseInt(current.pop());
      } catch (e) {
        return 0;
      }
    } else {
      return 0;
    }
  }

  var hostkey = "http://smotret24.ru"
    .replace("http://", "")
    .replace("https://", "");

  if (!window.rch_nws || !window.rch_nws[hostkey]) {
    if (!window.rch_nws) window.rch_nws = {};

    window.rch_nws[hostkey] = {
      type: Lampa.Platform.is("android")
        ? "apk"
        : Lampa.Platform.is("tizen")
          ? "cors"
          : undefined,
      startTypeInvoke: false,
      rchRegistry: false,
      apkVersion: getAndroidVersion(),
    };
  }

  window.rch_nws[hostkey].typeInvoke = function rchtypeInvoke(host, call) {
    if (!window.rch_nws[hostkey].startTypeInvoke) {
      window.rch_nws[hostkey].startTypeInvoke = true;

      var check = function check(good) {
        window.rch_nws[hostkey].type = Lampa.Platform.is("android")
          ? "apk"
          : good
            ? "cors"
            : "web";
        call();
      };

      if (Lampa.Platform.is("android") || Lampa.Platform.is("tizen"))
        check(true);
      else {
        var net = new Lampa.Reguest();
        net.silent(
          smotret24InlineSourceBase().indexOf(location.host) >= 0
            ? "https://github.com/"
            : host + "/cors/check",
          function () {
            check(true);
          },
          function () {
            check(false);
          },
          false,
          {
            dataType: "text",
          },
        );
      }
    } else call();
  };

  window.rch_nws[hostkey].Registry = function RchRegistry(
    client,
    startConnection,
  ) {
    window.rch_nws[hostkey].typeInvoke(
      smotret24InlineSourceBase(),
      function () {
        client.invoke("RchRegistry", {
          host: location.host,
          rchtype: Lampa.Platform.is("android")
            ? "apk"
            : Lampa.Platform.is("tizen")
              ? "cors"
              : window.rch_nws[hostkey].type || "web",
          apkVersion: Lampa.Platform.is("android")
            ? window.rch_nws[hostkey].apkVersion || 0
            : 0,
          player: Lampa.Storage.field("player"),
        });

        if (window.rch_nws[hostkey].rchRegistry) return;

        window.rch_nws[hostkey].rchRegistry = true;

        var handled = false;
        client.on("RchRegistry", function (clientIp, connectionId, rchtype) {
          if (startConnection && !handled) {
            handled = true;
            startConnection();
          }
        });

        client.on(
          "RchClient",
          function (rchId, url, data, headers, returnHeaders) {
            var network = new Lampa.Reguest();

            function sendResult(uri, html) {
              $.ajax({
                url:
                  smotret24InlineSourceBase() + "/rch/" + uri + "?id=" + rchId,
                type: "POST",
                data: html,
                async: true,
                cache: false,
                contentType: false,
                processData: false,
                success: function (j) {},
                error: function () {
                  client.invoke("RchResult", rchId, "");
                },
              });
            }

            function result(html) {
              if (Lampa.Arrays.isObject(html) || Lampa.Arrays.isArray(html)) {
                html = JSON.stringify(html);
              }

              if (
                typeof CompressionStream !== "undefined" &&
                html &&
                html.length > 1000
              ) {
                var compressionStream = new CompressionStream("gzip");
                var encoder = new TextEncoder();
                var readable = new ReadableStream({
                  start: function (controller) {
                    controller.enqueue(encoder.encode(html));
                    controller.close();
                  },
                });
                var compressedStream = readable.pipeThrough(compressionStream);
                new Response(compressedStream)
                  .arrayBuffer()
                  .then(function (compressedBuffer) {
                    var compressedArray = new Uint8Array(compressedBuffer);
                    if (compressedArray.length > html.length) {
                      sendResult("result", html);
                    } else {
                      sendResult("gzresult", compressedArray);
                    }
                  })
                  .catch(function () {
                    sendResult("result", html);
                  });
              } else {
                sendResult("result", html);
              }
            }

            if (url == "eval") {
              console.log("RCH", url, data);
              result(eval(data));
            } else if (url == "evalrun") {
              console.log("RCH", url, data);
              eval(data);
            } else if (url == "ping") {
              result("pong");
            } else {
              console.log("RCH", url);
              network["native"](
                url,
                result,
                function (e) {
                  console.log("RCH", "result empty, " + e.status);
                  result("");
                },
                data,
                {
                  dataType: "text",
                  timeout: 1000 * 8,
                  headers: headers,
                  returnHeaders: returnHeaders,
                },
              );
            }
          },
        );

        client.on("Connected", function (connectionId) {
          console.log("RCH", "ConnectionId: " + connectionId);
          window.rch_nws[hostkey].connectionId = connectionId;
        });
        client.on("Closed", function () {
          console.log("RCH", "Connection closed");
        });
        client.on("Error", function (err) {
          console.log("RCH", "error:", err);
        });
      },
    );
  };

  window.rch_nws[hostkey].typeInvoke(
    smotret24InlineSourceBase(),
    function () {},
  );

  function rchInvoke(json, call) {
    if (!window.nwsClient) window.nwsClient = {};

    var client = window.nwsClient[hostkey];
    if (client && client.connectionId != null) {
      call();
    } else if (client) {
      console.log("RCH", "Reconnecting...");
      client.reconnect(function () {
        call();
      });
    } else {
      window.nwsClient[hostkey] = new NativeWsClient(json.nws, {
        autoReconnect: true,
      });

      window.nwsClient[hostkey].on("Connected", function (connectionId) {
        window.rch_nws[hostkey].Registry(
          window.nwsClient[hostkey],
          function () {
            call();
          },
        );
      });

      window.nwsClient[hostkey].connect();
    }
  }

  function rchRun(json, call) {
    if (typeof NativeWsClient == "undefined") {
      Lampa.Utils.putScript(
        [smotret24InlineSourceBase() + "/js/nws-client-es5.js?v21042026"],
        function () {},
        false,
        function () {
          rchInvoke(json, call);
        },
        true,
      );
    } else {
      rchInvoke(json, call);
    }
  }

  function account(url) {
    url = smotret24InlineSourceUrl(url + "");
    if (url.indexOf("account_email=") == -1) {
      var email = Lampa.Storage.get("account_email");
      if (email)
        url = Lampa.Utils.addUrlComponent(
          url,
          "account_email=" + encodeURIComponent(email),
        );
    }
    if (url.indexOf("uid=") == -1) {
      var uid = Lampa.Storage.get("lampac_unic_id", "");
      if (uid)
        url = Lampa.Utils.addUrlComponent(
          url,
          "uid=" + encodeURIComponent(uid),
        );
    }
    if (url.indexOf("token=") == -1) {
      var token = "";
      if (token != "") url = Lampa.Utils.addUrlComponent(url, "token=");
    }
    if (url.indexOf("nws_id=") == -1) {
      var nws_id = Lampa.Storage.get("lampac_nws_id", "");
      if (nws_id)
        url = Lampa.Utils.addUrlComponent(
          url,
          "nws_id=" + encodeURIComponent(nws_id),
        );
    }
    var showy_token = Lampa.Storage.get("showy_token", "");
    if (url.indexOf("showy_token=") == -1 && showy_token) {
      url = Lampa.Utils.addUrlComponent(
        url,
        "showy_token=" + encodeURIComponent(showy_token),
      );
    }
    if (url.indexOf("access_ticket=") == -1) {
      var access_ticket = Lampa.Storage.get("showy_access_ticket", "");
      if (showy_token && access_ticket)
        url = Lampa.Utils.addUrlComponent(
          url,
          "access_ticket=" + encodeURIComponent(access_ticket),
        );
    }
    return url;
  }

  function addHeaders() {
    var kit_aesgcmkey = Lampa.Storage.get("kit_aesgcmkey", "");
    if (kit_aesgcmkey)
      return { "X-Kit-AesGcm": Lampa.Storage.get("kit_aesgcmkey", "") };
    return {};
  }

  function formatEpisodeNumber(episodeNumber) {
    return (episodeNumber < 10 ? "0" : "") + episodeNumber;
  }

  var Network = Lampa.Reguest;

  function component(object) {
    var network = new Network();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true,
    });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var sources = {};
    var last;
    var source;
    var balanser;
    var initialized;
    var balanser_timer;
    var images = [];
    var number_of_requests = 0;
    var number_of_requests_timer;
    var transient_retry_attempts = 0;
    var transient_retry_timer;
    var transient_retry_url = "";
    var life_wait_times = 0;
    var life_wait_timer;
    var showyProEntryBanner = window.ShowyProEntryBanner
      ? window.ShowyProEntryBanner.attach({
          owner: "smotret24_ru",
          component: "smotret24",
          movie: object.movie,
          scroll: scroll,
          apiBase: "http://87.120.126.125:8001",
          proUrl: "https://t.me/showybot?start=info",
        })
      : null;
    var filter_sources = {};
    var filter_translate = {
      season: Lampa.Lang.translate("torrent_serial_season"),
      voice: Lampa.Lang.translate("torrent_parser_voice"),
      source: Lampa.Lang.translate("settings_rest_source"),
    };
    var filter_find = {
      season: [],
      voice: [],
    };

    if (balansers_with_search == undefined) {
      network.timeout(10000);
      network.silent(
        account("http://smotret24.ru/lite/withsearch"),
        function (json) {
          balansers_with_search = json;
        },
        function () {
          balansers_with_search = [];
        },
      );
    }

    function balanserName(j) {
      var bals = j.balanser;
      var name = j.name.split(" ")[0];
      return (bals || name).toLowerCase();
    }

    function currentBalanserName() {
      if (balanser && sources[balanser] && sources[balanser].name)
        return sources[balanser].name;
      return (
        balanser || Lampa.Lang.translate("settings_rest_source") || "Источник"
      );
    }

    function clarificationSearchAdd(value) {
      var id = Lampa.Utils.hash(
        object.movie.number_of_seasons
          ? object.movie.original_name
          : object.movie.original_title,
      );
      var all = Lampa.Storage.get("clarification_search", "{}");

      all[id] = value;

      Lampa.Storage.set("clarification_search", all);
    }

    function clarificationSearchDelete() {
      var id = Lampa.Utils.hash(
        object.movie.number_of_seasons
          ? object.movie.original_name
          : object.movie.original_title,
      );
      var all = Lampa.Storage.get("clarification_search", "{}");

      delete all[id];

      Lampa.Storage.set("clarification_search", all);
    }

    function clarificationSearchGet() {
      var id = Lampa.Utils.hash(
        object.movie.number_of_seasons
          ? object.movie.original_name
          : object.movie.original_title,
      );
      var all = Lampa.Storage.get("clarification_search", "{}");

      return all[id];
    }

    this.initialize = function () {
      var _this = this;
      this.loading(true);
      filter.onSearch = function (value) {
        clarificationSearchAdd(value);

        Lampa.Activity.replace({
          search: value,
          clarification: true,
          similar: true,
        });
      };
      filter.onBack = function () {
        _this.start();
      };
      filter
        .render()
        .find(".selector")
        .on("hover:enter", function () {
          clearInterval(balanser_timer);
        });
      filter
        .render()
        .find(".filter--search")
        .appendTo(filter.render().find(".torrent-filter"));
      filter.onSelect = function (type, a, b) {
        if (type == "filter") {
          if (a.reset) {
            clarificationSearchDelete();

            _this.replaceChoice({
              season: 0,
              voice: 0,
              voice_url: "",
              voice_name: "",
            });
            setTimeout(function () {
              Lampa.Select.close();
              Lampa.Activity.replace({
                clarification: 0,
                similar: 0,
              });
            }, 10);
          } else {
            var url = filter_find[a.stype][b.index].url;
            var choice = _this.getChoice();
            if (a.stype == "voice") {
              choice.voice_name = filter_find.voice[b.index].title;
              choice.voice_url = url;
            }
            choice[a.stype] = b.index;
            _this.saveChoice(choice);
            _this.reset();
            _this.request(url);
            setTimeout(Lampa.Select.close, 10);
          }
        } else if (type == "sort") {
          Lampa.Select.close();
          object.lampac_custom_select = a.source;
          _this.changeBalanser(a.source);
        }
      };
      if (filter.addButtonBack) filter.addButtonBack();
      filter
        .render()
        .find(".filter--sort span")
        .text(Lampa.Lang.translate("lampac_balanser"));
      scroll.body().addClass("torrent-list");
      if (showyProEntryBanner) showyProEntryBanner.mount();
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find(".explorer__files-head"));
      scroll.body().append(Lampa.Template.get("lampac_content_loading"));
      Lampa.Controller.enable("content");
      this.loading(false);
      if (object.balanser) {
        files.render().find(".filter--search").remove();
        sources = {};
        sources[object.balanser] = { name: object.balanser };
        balanser = object.balanser;
        filter_sources = [];

        return network["native"](
          account(object.url.replace("rjson=", "nojson=")),
          this.parse.bind(this),
          function () {
            files.render().find(".torrent-filter").remove();
            _this.empty();
          },
          false,
          {
            dataType: "text",
            headers: addHeaders(),
          },
        );
      }
      this.externalids()
        .then(function () {
          return _this.createSource();
        })
        .then(function (json) {
          if (
            balansers_with_search &&
            !balansers_with_search.some(function (b) {
              return balanser.slice(0, b.length) == b;
            })
          ) {
            filter.render().find(".filter--search").addClass("hide");
          }
          _this.search();
        })
        ["catch"](function (e) {
          _this.noConnectToServer(e);
        });
    };
    this.rch = function (json, noreset) {
      var _this2 = this;
      rchRun(json, function () {
        if (!noreset) _this2.find();
        else noreset();
      });
    };
    this.externalids = function () {
      return new Promise(function (resolve, reject) {
        if (!object.movie.imdb_id || !object.movie.kinopoisk_id) {
          var query = [];
          query.push("id=" + encodeURIComponent(object.movie.id));
          query.push("serial=" + (object.movie.name ? 1 : 0));
          if (object.movie.imdb_id)
            query.push("imdb_id=" + (object.movie.imdb_id || ""));
          if (object.movie.kinopoisk_id)
            query.push("kinopoisk_id=" + (object.movie.kinopoisk_id || ""));
          var url = Defined.localhost + "externalids?" + query.join("&");
          network.timeout(10000);
          network.silent(
            account(url),
            function (json) {
              for (var name in json) {
                object.movie[name] = json[name];
              }
              resolve();
            },
            function () {
              resolve();
            },
            false,
            {
              headers: addHeaders(),
            },
          );
        } else resolve();
      });
    };
    this.updateBalanser = function (balanser_name) {
      var last_select_balanser = Lampa.Storage.cache(
        "online_last_balanser",
        3000,
        {},
      );
      last_select_balanser[object.movie.id] = balanser_name;
      Lampa.Storage.set("online_last_balanser", last_select_balanser);
    };
    this.changeBalanser = function (balanser_name) {
      this.updateBalanser(balanser_name);
      Lampa.Storage.set("online_balanser", balanser_name);
      var to = this.getChoice(balanser_name);
      var from = this.getChoice();
      if (from.voice_name) to.voice_name = from.voice_name;
      this.saveChoice(to, balanser_name);
      Lampa.Activity.replace();
    };
    this.requestParams = function (url) {
      var query = [];
      var card_source = object.movie.source || "tmdb"; //Lampa.Storage.field('source')
      query.push("id=" + encodeURIComponent(object.movie.id));

      if (object.movie.imdb_id)
        query.push("imdb_id=" + (object.movie.imdb_id || ""));
      if (object.movie.kinopoisk_id)
        query.push("kinopoisk_id=" + (object.movie.kinopoisk_id || ""));
      if (object.movie.tmdb_id)
        query.push("tmdb_id=" + (object.movie.tmdb_id || ""));

      if (object.movie.keywords && object.movie.keywords.results) {
        for (var i = 0, a = object.movie.keywords.results; i < a.length; i++) {
          if (a[i].name == "anime") {
            query.push("anime=1");
            break;
          }
        }
      }

      query.push(
        "title=" +
          encodeURIComponent(
            object.clarification
              ? object.search
              : object.movie.title || object.movie.name,
          ),
      );
      query.push(
        "original_title=" +
          encodeURIComponent(
            object.movie.original_title || object.movie.original_name,
          ),
      );
      query.push("serial=" + (object.movie.name ? 1 : 0));
      query.push("original_language=" + (object.movie.original_language || ""));
      query.push(
        "year=" +
          (
            (object.movie.release_date ||
              object.movie.first_air_date ||
              "0000") + ""
          ).slice(0, 4),
      );
      query.push("source=" + card_source);
      query.push("clarification=" + (object.clarification ? 1 : 0));
      query.push("similar=" + (object.similar ? true : false));
      query.push(
        "rchtype=" +
          ((window.rch_nws && window.rch_nws[hostkey]
            ? window.rch_nws[hostkey].type
            : window.rch && window.rch[hostkey]
              ? window.rch[hostkey].type
              : "") || ""),
      );
      if (Lampa.Storage.get("account_email", ""))
        query.push(
          "cub_id=" + Lampa.Utils.hash(Lampa.Storage.get("account_email", "")),
        );
      return url + (url.indexOf("?") >= 0 ? "&" : "?") + query.join("&");
    };
    this.getLastChoiceBalanser = function () {
      var last_select_balanser = Lampa.Storage.cache(
        "online_last_balanser",
        3000,
        {},
      );
      if (last_select_balanser[object.movie.id]) {
        return last_select_balanser[object.movie.id];
      } else {
        return Lampa.Storage.get(
          "online_balanser",
          filter_sources.length ? filter_sources[0] : "",
        );
      }
    };
    this.startSource = function (json) {
      return new Promise(function (resolve, reject) {
        json.forEach(function (j) {
          var name = balanserName(j);
          sources[name] = {
            url: j.url,
            name: /filmix|rezka/i.test(String(j.name || ""))
              ? String(j.name).replace(/\s*🔥\s*$/, "") + " 🔥"
              : j.name,
            show: typeof j.show == "undefined" ? true : j.show,
          };
        });
        filter_sources = Lampa.Arrays.getKeys(sources);
        if (filter_sources.length) {
          var last_select_balanser = Lampa.Storage.cache(
            "online_last_balanser",
            3000,
            {},
          );
          if (last_select_balanser[object.movie.id]) {
            balanser = last_select_balanser[object.movie.id];
          } else {
            balanser = Lampa.Storage.get("online_balanser", filter_sources[0]);
          }
          if (!sources[balanser]) balanser = filter_sources[0];
          if (!sources[balanser].show && !object.lampac_custom_select)
            balanser = filter_sources[0];
          source = sources[balanser].url;
          Lampa.Storage.set("active_balanser", balanser);
          resolve(json);
        } else {
          reject();
        }
      });
    };
    this.lifeSource = function () {
      var _this3 = this;
      return new Promise(function (resolve, reject) {
        var url = _this3.requestParams(
          Defined.localhost + "lifeevents?memkey=" + (_this3.memkey || ""),
        );
        var red = false;
        var gou = function gou(json, any) {
          if (json.accsdb) return reject(json);
          var last_balanser = _this3.getLastChoiceBalanser();
          if (!red) {
            var _filter = json.online.filter(function (c) {
              return any
                ? c.show
                : c.show && c.name.toLowerCase() == last_balanser;
            });
            if (_filter.length) {
              red = true;
              resolve(
                json.online.filter(function (c) {
                  return c.show;
                }),
              );
            } else if (any) {
              reject();
            }
          }
        };
        var fin = function fin(call) {
          network.timeout(8000);
          network.silent(
            account(url),
            function (json) {
              life_wait_times++;
              filter_sources = [];
              sources = {};
              json.online.forEach(function (j) {
                var name = balanserName(j);
                sources[name] = {
                  url: j.url,
                  name: /filmix|rezka/i.test(String(j.name || ""))
                    ? String(j.name).replace(/\s*🔥\s*$/, "") + " 🔥"
                    : j.name,
                  show: typeof j.show == "undefined" ? true : j.show,
                };
              });
              filter_sources = Lampa.Arrays.getKeys(sources);
              filter.set(
                "sort",
                filter_sources.map(function (e) {
                  return {
                    title: sources[e].name,
                    source: e,
                    selected: e == balanser,
                    ghost: !sources[e].show,
                  };
                }),
              );
              filter.chosen("sort", [
                sources[balanser] ? sources[balanser].name : balanser,
              ]);
              gou(json);
              var lastb = _this3.getLastChoiceBalanser();
              if (life_wait_times > 15 || json.ready) {
                filter.render().find(".lampac-balanser-loader").remove();
                gou(json, true);
              } else if (!red && sources[lastb] && sources[lastb].show) {
                gou(json, true);
                life_wait_timer = setTimeout(fin, 1000);
              } else {
                life_wait_timer = setTimeout(fin, 1000);
              }
            },
            function () {
              life_wait_times++;
              if (life_wait_times > 15) {
                reject();
              } else {
                life_wait_timer = setTimeout(fin, 1000);
              }
            },
            false,
            {
              headers: addHeaders(),
            },
          );
        };
        fin();
      });
    };
    this.createSource = function () {
      var _this4 = this;
      return new Promise(function (resolve, reject) {
        var url = _this4.requestParams(
          Defined.localhost + "lite/events?life=true",
        );
        network.timeout(15000);
        network.silent(
          account(url),
          function (json) {
            if (json.accsdb) return reject(json);
            if (json.life) {
              _this4.memkey = json.memkey;
              if (json.title) {
                if (object.movie.name) object.movie.name = json.title;
                if (object.movie.title) object.movie.title = json.title;
              }
              filter
                .render()
                .find(".filter--sort")
                .append(
                  '<span class="lampac-balanser-loader" style="width: 1.2em; height: 1.2em; margin-top: 0; background: url(./img/loader.svg) no-repeat 50% 50%; background-size: contain; margin-left: 0.5em"></span>',
                );
              _this4
                .lifeSource()
                .then(_this4.startSource)
                .then(resolve)
                ["catch"](reject);
            } else {
              _this4.startSource(json).then(resolve)["catch"](reject);
            }
          },
          reject,
          false,
          {
            headers: addHeaders(),
          },
        );
      });
    };
    /**
     * Подготовка
     */
    this.create = function () {
      return this.render();
    };
    /**
     * Начать поиск
     */
    this.search = function () {
      //this.loading(true)
      this.filter(
        {
          source: filter_sources,
        },
        this.getChoice(),
      );
      this.find();
    };
    this.find = function () {
      this.request(this.requestParams(source));
    };
    this.request = function (url, is_transient_retry) {
      var _this5 = this;
      if (!is_transient_retry && transient_retry_url !== url) {
        clearTimeout(transient_retry_timer);
        transient_retry_attempts = 0;
        transient_retry_url = url;
      }
      var request_source_name = String(balanser || "").toLowerCase();
      var is_filmix_request =
        request_source_name.indexOf("fxapi") === 0 ||
        request_source_name.indexOf("filmix") === 0;
      network.timeout(is_filmix_request ? 25000 : 15000);
      number_of_requests++;
      if (number_of_requests < 10) {
        network["native"](
          account(url),
          function (str) {
            _this5.parse(str, url);
          },
          function (er) {
            if (!_this5.retryTransientSource(er, url)) _this5.doesNotAnswer(er);
          },
          false,
          {
            dataType: "text",
            headers: addHeaders(),
          },
        );
        clearTimeout(number_of_requests_timer);
        number_of_requests_timer = setTimeout(function () {
          number_of_requests = 0;
        }, 4000);
      } else this.empty();
    };
    this.clearTransientRetry = function () {
      clearTimeout(transient_retry_timer);
      transient_retry_attempts = 0;
      transient_retry_url = "";
    };
    this.retryTransientSource = function (er, url) {
      var _this6 = this;
      var source_name = String(balanser || "").toLowerCase();
      var is_filmix =
        source_name.indexOf("fxapi") === 0 ||
        source_name.indexOf("filmix") === 0;
      if (!is_filmix || (er && er.accsdb) || !url) return false;
      var retry_status =
        er && typeof er.status !== "undefined" ? Number(er.status) : -1;
      var retry_error = String(
        (er && (er.statusText || er.textStatus || er.message)) || "",
      ).toLowerCase();
      var is_timeout =
        retry_status === 0 ||
        retry_error.indexOf("timeout") >= 0 ||
        retry_error.indexOf("timed out") >= 0;
      var retry_limit = is_timeout ? 1 : 4;
      if (transient_retry_url !== url) {
        clearTimeout(transient_retry_timer);
        transient_retry_attempts = 0;
        transient_retry_url = url;
      }
      if (transient_retry_attempts >= retry_limit) return false;
      transient_retry_attempts++;
      clearTimeout(transient_retry_timer);
      var retry_delays = [500, 1100, 2000, 3200];
      transient_retry_timer = setTimeout(
        function () {
          var active = Lampa.Activity.active && Lampa.Activity.active();
          if (!active || active.activity !== _this6.activity) return;
          _this6.request(url, true);
        },
        retry_delays[transient_retry_attempts - 1],
      );
      this.activity.loader(true);
      return true;
    };
    this.parseJsonDate = function (str, name) {
      try {
        var html = $("<div>" + str + "</div>");
        var elems = [];
        html.find(name).each(function () {
          var item = $(this);
          var data = JSON.parse(item.attr("data-json"));
          var season = item.attr("s");
          var episode = item.attr("e");
          var text = item.text();
          if (!object.movie.name) {
            if (text.match(/\d+p/i)) {
              if (!data.quality) {
                data.quality = {};
                data.quality[text] = data.url;
              }
              text = object.movie.title;
            }
            if (text == "По умолчанию") {
              text = object.movie.title;
            }
          }
          if (episode) data.episode = parseInt(episode);
          if (season) data.season = parseInt(season);
          if (text) data.text = text;
          data.active = item.hasClass("active");
          elems.push(data);
        });
        return elems;
      } catch (e) {
        return [];
      }
    };
    this.getFileUrl = function (file, call, waiting_rch) {
      var _this = this;

      if (
        Lampa.Storage.field("player") !== "inner" &&
        file.stream &&
        Lampa.Platform.is("apple")
      ) {
        var newfile = Lampa.Arrays.clone(file);
        newfile.method = "play";
        newfile.url = file.stream;
        call(newfile, {});
      } else if (file.method == "play") call(file, {});
      else {
        Lampa.Loading.start(function () {
          Lampa.Loading.stop();
          Lampa.Controller.toggle("content");
          network.clear();
        });
        network["native"](
          account(file.url),
          function (json) {
            if (json.rch) {
              if (waiting_rch) {
                waiting_rch = false;
                Lampa.Loading.stop();
                call(false, {});
              } else {
                _this.rch(json, function () {
                  Lampa.Loading.stop();

                  _this.getFileUrl(file, call, true);
                });
              }
            } else {
              Lampa.Loading.stop();
              call(json, json);
            }
          },
          function () {
            Lampa.Loading.stop();
            call(false, {});
          },
          false,
          {
            headers: addHeaders(),
          },
        );
      }
    };
    this.toPlayElement = function (file) {
      var play = {
        title: file.title,
        url: file.url,
        quality: file.qualitys,
        timeline: file.timeline,
        subtitles: file.subtitles,
        segments: file.segments,
        callback: file.mark,
        season: file.season,
        episode: file.episode,
        voice_name: file.voice_name,
        thumbnail: file.thumbnail,
      };
      return play;
    };
    this.orUrlReserve = function (data) {
      if (
        data.url &&
        typeof data.url == "string" &&
        data.url.indexOf(" or ") !== -1
      ) {
        var urls = data.url.split(" or ");
        data.url = urls[0];
        data.url_reserve = urls[1];
      }
    };
    this.setDefaultQuality = function (data) {
      if (Lampa.Arrays.getKeys(data.quality).length) {
        for (var q in data.quality) {
          if (parseInt(q) == Lampa.Storage.field("video_quality_default")) {
            data.url = data.quality[q];
            this.orUrlReserve(data);
          }
          if (data.quality[q].indexOf(" or ") !== -1)
            data.quality[q] = data.quality[q].split(" or ")[0];
        }
      }
    };
    this.display = function (videos) {
      var _this5 = this;
      this.draw(videos, {
        onEnter: function onEnter(item, html) {
          _this5.getFileUrl(
            item,
            function (json, json_call) {
              if (json && json.url) {
                var playlist = [];
                var first = _this5.toPlayElement(item);
                first.url = json.url;
                first.headers = json_call.headers || json.headers;
                first.quality = json_call.quality || item.qualitys;
                first.segments = json_call.segments || item.segments;
                first.hls_manifest_timeout =
                  json_call.hls_manifest_timeout || json.hls_manifest_timeout;
                first.subtitles = json.subtitles;
                first.subtitles_call =
                  json_call.subtitles_call || json.subtitles_call;
                if (json.vast && json.vast.url) {
                  first.vast_url = json.vast.url;
                  first.vast_msg = json.vast.msg;
                  first.vast_region = json.vast.region;
                  first.vast_platform = json.vast.platform;
                  first.vast_screen = json.vast.screen;
                }
                _this5.orUrlReserve(first);
                _this5.setDefaultQuality(first);
                if (item.season) {
                  videos.forEach(function (elem) {
                    var cell = _this5.toPlayElement(elem);
                    if (elem == item) cell.url = json.url;
                    else {
                      if (elem.method == "call") {
                        if (Lampa.Storage.field("player") !== "inner") {
                          cell.url = elem.stream;
                          delete cell.quality;
                        } else {
                          cell.url = function (call) {
                            _this5.getFileUrl(
                              elem,
                              function (stream, stream_json) {
                                if (stream.url) {
                                  cell.url = stream.url;
                                  cell.quality =
                                    stream_json.quality || elem.qualitys;
                                  cell.segments =
                                    stream_json.segments || elem.segments;
                                  cell.subtitles = stream.subtitles;
                                  _this5.orUrlReserve(cell);
                                  _this5.setDefaultQuality(cell);
                                  elem.mark();
                                } else {
                                  cell.url = "";
                                  Lampa.Noty.show(
                                    Lampa.Lang.translate("lampac_nolink"),
                                  );
                                }
                                call();
                              },
                              function () {
                                cell.url = "";
                                call();
                              },
                            );
                          };
                        }
                      } else {
                        cell.url = elem.url;
                      }
                    }
                    _this5.orUrlReserve(cell);
                    _this5.setDefaultQuality(cell);
                    playlist.push(cell);
                  }); //Lampa.Player.playlist(playlist)
                } else {
                  playlist.push(first);
                }
                if (playlist.length > 1) first.playlist = playlist;
                if (first.url) {
                  var element = first;
                  element.isonline = true;

                  Lampa.Player.play(element);
                  Lampa.Player.playlist(playlist);
                  if (element.subtitles_call)
                    _this5.loadSubtitles(element.subtitles_call);
                  item.mark();
                  _this5.updateBalanser(balanser);
                } else {
                  Lampa.Noty.show(Lampa.Lang.translate("lampac_nolink"));
                }
              } else Lampa.Noty.show(Lampa.Lang.translate("lampac_nolink"));
            },
            true,
          );
        },
        onContextMenu: function onContextMenu(item, html, data, call) {
          _this5.getFileUrl(
            item,
            function (stream) {
              call({
                file: stream.url,
                quality: item.qualitys,
              });
            },
            true,
          );
        },
      });
      this.filter(
        {
          season: filter_find.season.map(function (s) {
            return s.title;
          }),
          voice: filter_find.voice.map(function (b) {
            return b.title;
          }),
        },
        this.getChoice(),
      );
    };
    this.loadSubtitles = function (link) {
      network.silent(
        account(link),
        function (subs) {
          Lampa.Player.subtitles(subs);
        },
        function () {},
        false,
        {
          headers: addHeaders(),
        },
      );
    };
    this.parse = function (str, request_url) {
      var json = Lampa.Arrays.decodeJson(str, {});
      if (Lampa.Arrays.isObject(str) && str.rch) json = str;
      if (json.rch) return this.rch(json);
      try {
        var items = this.parseJsonDate(str, ".videos__item");
        var buttons = this.parseJsonDate(str, ".videos__button");
        if (items.length) this.clearTransientRetry();
        if (
          items.length == 1 &&
          items[0].method == "link" &&
          !items[0].similar
        ) {
          filter_find.season = items.map(function (s) {
            return {
              title: s.text,
              url: s.url,
            };
          });
          this.replaceChoice({
            season: 0,
          });
          this.request(items[0].url);
        } else {
          this.activity.loader(false);
          var videos = items.filter(function (v) {
            return v.method == "play" || v.method == "call";
          });
          var similar = items.filter(function (v) {
            return v.similar;
          });
          if (videos.length) {
            if (buttons.length) {
              filter_find.voice = buttons.map(function (b) {
                return {
                  title: b.text,
                  url: b.url,
                };
              });
              var select_voice_url = this.getChoice(balanser).voice_url;
              var select_voice_name = this.getChoice(balanser).voice_name;
              var find_voice_url = buttons.find(function (v) {
                return v.url == select_voice_url;
              });
              var find_voice_name = buttons.find(function (v) {
                return v.text == select_voice_name;
              });
              var find_voice_active = buttons.find(function (v) {
                return v.active;
              }); ////console.log('b',buttons)
              ////console.log('u',find_voice_url)
              ////console.log('n',find_voice_name)
              ////console.log('a',find_voice_active)
              if (find_voice_url && !find_voice_url.active) {
                //console.log('Lampac', 'go to voice', find_voice_url);
                this.replaceChoice({
                  voice: buttons.indexOf(find_voice_url),
                  voice_name: find_voice_url.text,
                });
                this.request(find_voice_url.url);
              } else if (find_voice_name && !find_voice_name.active) {
                //console.log('Lampac', 'go to voice', find_voice_name);
                this.replaceChoice({
                  voice: buttons.indexOf(find_voice_name),
                  voice_name: find_voice_name.text,
                });
                this.request(find_voice_name.url);
              } else {
                if (find_voice_active) {
                  this.replaceChoice({
                    voice: buttons.indexOf(find_voice_active),
                    voice_name: find_voice_active.text,
                  });
                }
                this.display(videos);
              }
            } else {
              this.replaceChoice({
                voice: 0,
                voice_url: "",
                voice_name: "",
              });
              this.display(videos);
            }
          } else if (items.length) {
            if (similar.length) {
              this.similars(similar);
              this.activity.loader(false);
            } else {
              //this.activity.loader(true)
              filter_find.season = items.map(function (s) {
                return {
                  title: s.text,
                  url: s.url,
                };
              });
              var select_season = this.getChoice(balanser).season;
              var season = filter_find.season[select_season];
              if (!season) season = filter_find.season[0];
              //console.log('Lampac', 'go to season', season);
              this.request(season.url);
            }
          } else {
            if (!this.retryTransientSource(json, request_url))
              this.doesNotAnswer(json);
          }
        }
      } catch (e) {
        //console.log('Lampac', 'error', e.stack);
        this.doesNotAnswer(e);
      }
    };
    this.similars = function (json) {
      var _this6 = this;
      scroll.clear();
      json.forEach(function (elem) {
        elem.title = elem.text;
        elem.info = "";
        var info = [];
        var year = (
          (elem.start_date ||
            elem.year ||
            object.movie.release_date ||
            object.movie.first_air_date ||
            "") + ""
        ).slice(0, 4);
        if (year) info.push(year);
        if (elem.details) info.push(elem.details);
        var name = elem.title || elem.text;
        elem.title = name;
        elem.time = elem.time || "";
        elem.info = info.join('<span class="online-prestige-split">●</span>');
        var item = Lampa.Template.get("lampac_prestige_folder", elem);
        if (elem.img) {
          var image = $(
            '<img style="height: 7em; width: 7em; border-radius: 0.3em;"/>',
          );
          item.find(".online-prestige__folder").empty().append(image);

          if (elem.img !== undefined) {
            if (elem.img.charAt(0) === "/")
              elem.img =
                smotret24InlineSourceBase() + "/" + elem.img.substring(1);
            if (elem.img.indexOf("/proxyimg") !== -1)
              elem.img = account(elem.img);
          }

          Lampa.Utils.imgLoad(image, elem.img);
        }
        item
          .on("hover:enter", function () {
            _this6.reset();
            _this6.request(elem.url);
          })
          .on("hover:focus", function (e) {
            last = e.target;
            scroll.update($(e.target), true);
          });
        scroll.append(item);
      });
      this.filter(
        {
          season: filter_find.season.map(function (s) {
            return s.title;
          }),
          voice: filter_find.voice.map(function (b) {
            return b.title;
          }),
        },
        this.getChoice(),
      );
      Lampa.Controller.enable("content");
    };
    this.getChoice = function (for_balanser) {
      var data = Lampa.Storage.cache(
        "online_choice_" + (for_balanser || balanser),
        3000,
        {},
      );
      var save = data[object.movie.id] || {};
      Lampa.Arrays.extend(save, {
        season: 0,
        voice: 0,
        voice_name: "",
        voice_id: 0,
        episodes_view: {},
        movie_view: "",
      });
      return save;
    };
    this.saveChoice = function (choice, for_balanser) {
      var data = Lampa.Storage.cache(
        "online_choice_" + (for_balanser || balanser),
        3000,
        {},
      );
      data[object.movie.id] = choice;
      Lampa.Storage.set("online_choice_" + (for_balanser || balanser), data);
      this.updateBalanser(for_balanser || balanser);
    };
    this.replaceChoice = function (choice, for_balanser) {
      var to = this.getChoice(for_balanser);
      Lampa.Arrays.extend(to, choice, true);
      this.saveChoice(to, for_balanser);
    };
    this.clearImages = function () {
      images.forEach(function (img) {
        img.onerror = function () {};
        img.onload = function () {};
        img.src = "";
      });
      images = [];
    };
    /**
     * Очистить список файлов
     */
    this.reset = function () {
      last = false;
      this.clearTransientRetry();
      clearInterval(balanser_timer);
      network.clear();
      this.clearImages();
      scroll.render().find(".empty").remove();
      scroll.clear();
      scroll.reset();
      scroll.body().append(Lampa.Template.get("lampac_content_loading"));
    };
    /**
     * Загрузка
     */
    this.loading = function (status) {
      if (status) this.activity.loader(true);
      else {
        this.activity.loader(false);
        this.activity.toggle();
      }
    };
    /**
     * Построить фильтр
     */
    this.filter = function (filter_items, choice) {
      var _this7 = this;
      var select = [];
      var add = function add(type, title) {
        var need = _this7.getChoice();
        var items = filter_items[type];
        var subitems = [];
        var value = need[type];
        items.forEach(function (name, i) {
          subitems.push({
            title: name,
            selected: value == i,
            index: i,
          });
        });
        select.push({
          title: title,
          subtitle: items[value],
          items: subitems,
          stype: type,
        });
      };
      filter_items.source = filter_sources;
      select.push({
        title: Lampa.Lang.translate("torrent_parser_reset"),
        reset: true,
      });
      this.saveChoice(choice);
      if (filter_items.voice && filter_items.voice.length)
        add("voice", Lampa.Lang.translate("torrent_parser_voice"));
      if (filter_items.season && filter_items.season.length)
        add("season", Lampa.Lang.translate("torrent_serial_season"));
      filter.set("filter", select);
      filter.set(
        "sort",
        filter_sources.map(function (e) {
          return {
            title: sources[e].name,
            source: e,
            selected: e == balanser,
            ghost: !sources[e].show,
          };
        }),
      );
      this.selected(filter_items);
    };
    /**
     * Показать что выбрано в фильтре
     */
    this.selected = function (filter_items) {
      var need = this.getChoice(),
        select = [];
      for (var i in need) {
        if (filter_items[i] && filter_items[i].length) {
          if (i == "voice") {
            select.push(filter_translate[i] + ": " + filter_items[i][need[i]]);
          } else if (i !== "source") {
            if (filter_items.season.length >= 1) {
              select.push(
                filter_translate.season + ": " + filter_items[i][need[i]],
              );
            }
          }
        }
      }
      filter.chosen("filter", select);
      filter.chosen("sort", [sources[balanser].name]);
    };
    this.getEpisodes = function (season, call) {
      var episodes = [];
      var tmdb_id = object.movie.id;
      if (["cub", "tmdb"].indexOf(object.movie.source || "tmdb") == -1)
        tmdb_id = object.movie.tmdb_id;
      if (typeof tmdb_id == "number" && object.movie.name) {
        Lampa.Api.sources.tmdb.get(
          "tv/" + tmdb_id + "/season/" + season,
          {},
          function (data) {
            episodes = data.episodes || [];

            call(episodes);
          },
          function () {
            call(episodes);
          },
        );
      } else call(episodes);
    };
    this.watched = function (set) {
      var file_id = Lampa.Utils.hash(
        object.movie.number_of_seasons
          ? object.movie.original_name
          : object.movie.original_title,
      );
      var watched = Lampa.Storage.cache("online_watched_last", 5000, {});
      if (set) {
        if (!watched[file_id]) watched[file_id] = {};
        Lampa.Arrays.extend(watched[file_id], set, true);
        Lampa.Storage.set("online_watched_last", watched);
        this.updateWatched();
      } else {
        return watched[file_id];
      }
    };
    this.updateWatched = function () {
      var watched = this.watched();
      var body = scroll
        .body()
        .find(".online-prestige-watched .online-prestige-watched__body")
        .empty();
      if (watched) {
        var line = [];
        if (watched.balanser_name) line.push(watched.balanser_name);
        if (watched.voice_name) line.push(watched.voice_name);
        if (watched.season)
          line.push(
            Lampa.Lang.translate("torrent_serial_season") +
              " " +
              watched.season,
          );
        if (watched.episode)
          line.push(
            Lampa.Lang.translate("torrent_serial_episode") +
              " " +
              watched.episode,
          );
        line.forEach(function (n) {
          body.append("<span>" + n + "</span>");
        });
      } else
        body.append(
          "<span>" +
            Lampa.Lang.translate("lampac_no_watch_history") +
            "</span>",
        );
    };
    /**
     * Отрисовка файлов
     */
    this.draw = function (items) {
      var _this8 = this;
      var params =
        arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (!items.length) return this.empty();
      scroll.clear();
      if (!object.balanser)
        scroll.append(Lampa.Template.get("lampac_prestige_watched", {}));
      this.updateWatched();
      this.getEpisodes(items[0].season, function (episodes) {
        var viewed = Lampa.Storage.cache("online_view", 5000, []);
        var serial = object.movie.name ? true : false;
        var choice = _this8.getChoice();
        var fully = window.innerWidth > 480;
        var scroll_to_element = false;
        var scroll_to_mark = false;
        items.forEach(function (element, index) {
          var episode =
            serial && episodes.length && !params.similars
              ? episodes.find(function (e) {
                  return e.episode_number == element.episode;
                })
              : false;
          var episode_num = element.episode || index + 1;
          var episode_last = choice.episodes_view[element.season];
          var voice_name =
            choice.voice_name ||
            (filter_find.voice[0] ? filter_find.voice[0].title : false) ||
            element.voice_name ||
            (serial ? "Неизвестно" : element.text) ||
            "Неизвестно";
          if (element.quality) {
            element.qualitys = element.quality;
            element.quality = Lampa.Arrays.getKeys(element.quality)[0];
          }
          Lampa.Arrays.extend(element, {
            voice_name: voice_name,
            info:
              voice_name.length > 60
                ? voice_name.substr(0, 60) + "..."
                : voice_name,
            quality: "",
            time: Lampa.Utils.secondsToTime(
              (episode ? episode.runtime : object.movie.runtime) * 60,
              true,
            ),
          });
          var hash_timeline = Lampa.Utils.hash(
            element.season
              ? [
                  element.season,
                  element.season > 10 ? ":" : "",
                  element.episode,
                  object.movie.original_title,
                ].join("")
              : object.movie.original_title,
          );
          var hash_behold = Lampa.Utils.hash(
            element.season
              ? [
                  element.season,
                  element.season > 10 ? ":" : "",
                  element.episode,
                  object.movie.original_title,
                  element.voice_name,
                ].join("")
              : object.movie.original_title + element.voice_name,
          );
          var data = {
            hash_timeline: hash_timeline,
            hash_behold: hash_behold,
          };
          var info = [];
          if (element.season) {
            element.translate_episode_end = _this8.getLastEpisode(items);
            element.translate_voice = element.voice_name;
          }
          if (element.text && !episode) element.title = element.text;
          element.timeline = Lampa.Timeline.view(hash_timeline);
          if (episode) {
            element.title = episode.name;
            if (element.info.length < 30 && episode.vote_average)
              info.push(
                Lampa.Template.get(
                  "lampac_prestige_rate",
                  {
                    rate: parseFloat(episode.vote_average + "").toFixed(1),
                  },
                  true,
                ),
              );
            if (episode.air_date && fully)
              info.push(Lampa.Utils.parseTime(episode.air_date).full);
          } else if (object.movie.release_date && fully) {
            info.push(Lampa.Utils.parseTime(object.movie.release_date).full);
          }
          if (!serial && object.movie.tagline && element.info.length < 30)
            info.push(object.movie.tagline);
          if (element.info) info.push(element.info);
          if (info.length)
            element.info = info
              .map(function (i) {
                return "<span>" + i + "</span>";
              })
              .join('<span class="online-prestige-split">●</span>');
          var html = Lampa.Template.get("lampac_prestige_full", element);
          var loader = html.find(".online-prestige__loader");
          var image = html.find(".online-prestige__img");
          if (object.balanser) image.hide();
          if (!serial) {
            if (choice.movie_view == hash_behold) scroll_to_element = html;
          } else if (
            typeof episode_last !== "undefined" &&
            episode_last == episode_num
          ) {
            scroll_to_element = html;
          }
          if (serial && !episode) {
            image.append(
              '<div class="online-prestige__episode-number">' +
                formatEpisodeNumber(element.episode || index + 1) +
                "</div>",
            );
            loader.remove();
          } else if (!serial && object.movie.backdrop_path == "undefined")
            loader.remove();
          else {
            var img = html.find("img")[0];
            img.onerror = function () {
              img.src = "./img/img_broken.svg";
            };
            img.onload = function () {
              image.addClass("online-prestige__img--loaded");
              loader.remove();
              if (serial)
                image.append(
                  '<div class="online-prestige__episode-number">' +
                    formatEpisodeNumber(element.episode || index + 1) +
                    "</div>",
                );
            };
            img.src = Lampa.TMDB.image(
              "t/p/w300" +
                (episode ? episode.still_path : object.movie.backdrop_path),
            );
            images.push(img);
            element.thumbnail = img.src;
          }
          html
            .find(".online-prestige__timeline")
            .append(Lampa.Timeline.render(element.timeline));
          if (viewed.indexOf(hash_behold) !== -1) {
            scroll_to_mark = html;
            html
              .find(".online-prestige__img")
              .append(
                '<div class="online-prestige__viewed">' +
                  Lampa.Template.get("icon_viewed", {}, true) +
                  "</div>",
              );
          }
          element.mark = function () {
            viewed = Lampa.Storage.cache("online_view", 5000, []);
            if (viewed.indexOf(hash_behold) == -1) {
              viewed.push(hash_behold);
              Lampa.Storage.set("online_view", viewed);
              if (html.find(".online-prestige__viewed").length == 0) {
                html
                  .find(".online-prestige__img")
                  .append(
                    '<div class="online-prestige__viewed">' +
                      Lampa.Template.get("icon_viewed", {}, true) +
                      "</div>",
                  );
              }
            }
            choice = _this8.getChoice();
            if (!serial) {
              choice.movie_view = hash_behold;
            } else {
              choice.episodes_view[element.season] = episode_num;
            }
            _this8.saveChoice(choice);
            var voice_name_text =
              choice.voice_name || element.voice_name || element.title;
            if (voice_name_text.length > 30)
              voice_name_text = voice_name_text.slice(0, 30) + "...";
            _this8.watched({
              balanser: balanser,
              balanser_name: Lampa.Utils.capitalizeFirstLetter(
                sources[balanser]
                  ? sources[balanser].name.split(" ")[0]
                  : balanser,
              ),
              voice_id: choice.voice_id,
              voice_name: voice_name_text,
              episode: element.episode,
              season: element.season,
            });
          };
          element.unmark = function () {
            viewed = Lampa.Storage.cache("online_view", 5000, []);
            if (viewed.indexOf(hash_behold) !== -1) {
              Lampa.Arrays.remove(viewed, hash_behold);
              Lampa.Storage.set("online_view", viewed);
              Lampa.Storage.remove("online_view", hash_behold);
              html.find(".online-prestige__viewed").remove();
            }
          };
          element.timeclear = function () {
            element.timeline.percent = 0;
            element.timeline.time = 0;
            element.timeline.duration = 0;
            Lampa.Timeline.update(element.timeline);
          };
          html
            .on("hover:enter", function () {
              if (object.movie.id)
                Lampa.Favorite.add("history", object.movie, 100);
              if (params.onEnter) params.onEnter(element, html, data);
            })
            .on("hover:focus", function (e) {
              last = e.target;
              if (params.onFocus) params.onFocus(element, html, data);
              scroll.update($(e.target), true);
            });
          if (params.onRender) params.onRender(element, html, data);
          _this8.contextMenu({
            html: html,
            element: element,
            onFile: function onFile(call) {
              if (params.onContextMenu)
                params.onContextMenu(element, html, data, call);
            },
            onClearAllMark: function onClearAllMark() {
              items.forEach(function (elem) {
                elem.unmark();
              });
            },
            onClearAllTime: function onClearAllTime() {
              items.forEach(function (elem) {
                elem.timeclear();
              });
            },
          });
          scroll.append(html);
        });
        if (serial && episodes.length > items.length && !params.similars) {
          var left = episodes.slice(items.length);
          left.forEach(function (episode) {
            var info = [];
            if (episode.vote_average)
              info.push(
                Lampa.Template.get(
                  "lampac_prestige_rate",
                  {
                    rate: parseFloat(episode.vote_average + "").toFixed(1),
                  },
                  true,
                ),
              );
            if (episode.air_date)
              info.push(Lampa.Utils.parseTime(episode.air_date).full);
            var air = new Date((episode.air_date + "").replace(/-/g, "/"));
            var now = Date.now();
            var day = Math.round((air.getTime() - now) / (24 * 60 * 60 * 1000));
            var txt =
              Lampa.Lang.translate("full_episode_days_left") + ": " + day;
            var html = Lampa.Template.get("lampac_prestige_full", {
              time: Lampa.Utils.secondsToTime(
                (episode ? episode.runtime : object.movie.runtime) * 60,
                true,
              ),
              info: info.length
                ? info
                    .map(function (i) {
                      return "<span>" + i + "</span>";
                    })
                    .join('<span class="online-prestige-split">●</span>')
                : "",
              title: episode.name,
              quality: day > 0 ? txt : "",
            });
            var loader = html.find(".online-prestige__loader");
            var image = html.find(".online-prestige__img");
            var season = items[0] ? items[0].season : 1;
            html
              .find(".online-prestige__timeline")
              .append(
                Lampa.Timeline.render(
                  Lampa.Timeline.view(
                    Lampa.Utils.hash(
                      [
                        season,
                        episode.episode_number,
                        object.movie.original_title,
                      ].join(""),
                    ),
                  ),
                ),
              );
            var img = html.find("img")[0];
            if (episode.still_path) {
              img.onerror = function () {
                img.src = "./img/img_broken.svg";
              };
              img.onload = function () {
                image.addClass("online-prestige__img--loaded");
                loader.remove();
                image.append(
                  '<div class="online-prestige__episode-number">' +
                    formatEpisodeNumber(episode.episode_number) +
                    "</div>",
                );
              };
              img.src = Lampa.TMDB.image("t/p/w300" + episode.still_path);
              images.push(img);
            } else {
              loader.remove();
              image.append(
                '<div class="online-prestige__episode-number">' +
                  formatEpisodeNumber(episode.episode_number) +
                  "</div>",
              );
            }
            html.on("hover:focus", function (e) {
              last = e.target;
              scroll.update($(e.target), true);
            });
            html.css("opacity", "0.5");
            scroll.append(html);
          });
        }
        if (scroll_to_element) {
          last = scroll_to_element[0];
        } else if (scroll_to_mark) {
          last = scroll_to_mark[0];
        }
        Lampa.Controller.enable("content");
      });
    };
    /**
     * Меню
     */
    this.contextMenu = function (params) {
      params.html
        .on("hover:long", function () {
          function show(extra) {
            var enabled = Lampa.Controller.enabled().name;
            var menu = [];
            if (Lampa.Platform.is("webos")) {
              menu.push({
                title: Lampa.Lang.translate("player_lauch") + " - Webos",
                player: "webos",
              });
            }
            if (Lampa.Platform.is("android")) {
              menu.push({
                title: Lampa.Lang.translate("player_lauch") + " - Android",
                player: "android",
              });
            }
            menu.push({
              title: Lampa.Lang.translate("player_lauch") + " - Lampa",
              player: "lampa",
            });
            menu.push({
              title: Lampa.Lang.translate("lampac_video"),
              separator: true,
            });
            menu.push({
              title: Lampa.Lang.translate("torrent_parser_label_title"),
              mark: true,
            });
            menu.push({
              title: Lampa.Lang.translate("torrent_parser_label_cancel_title"),
              unmark: true,
            });
            menu.push({
              title: Lampa.Lang.translate("time_reset"),
              timeclear: true,
            });
            if (extra) {
              menu.push({
                title: Lampa.Lang.translate("copy_link"),
                copylink: true,
              });
            }
            if (window.lampac_online_context_menu)
              window.lampac_online_context_menu.push(menu, extra, params);
            menu.push({
              title: Lampa.Lang.translate("more"),
              separator: true,
            });
            if (
              Lampa.Account.logged() &&
              params.element &&
              typeof params.element.season !== "undefined" &&
              params.element.translate_voice
            ) {
              menu.push({
                title: Lampa.Lang.translate("lampac_voice_subscribe"),
                subscribe: true,
              });
            }
            menu.push({
              title: Lampa.Lang.translate("lampac_clear_all_marks"),
              clearallmark: true,
            });
            menu.push({
              title: Lampa.Lang.translate("lampac_clear_all_timecodes"),
              timeclearall: true,
            });
            Lampa.Select.show({
              title: Lampa.Lang.translate("title_action"),
              items: menu,
              onBack: function onBack() {
                Lampa.Controller.toggle(enabled);
              },
              onSelect: function onSelect(a) {
                if (a.mark) params.element.mark();
                if (a.unmark) params.element.unmark();
                if (a.timeclear) params.element.timeclear();
                if (a.clearallmark) params.onClearAllMark();
                if (a.timeclearall) params.onClearAllTime();
                if (window.lampac_online_context_menu)
                  window.lampac_online_context_menu.onSelect(a, params);
                Lampa.Controller.toggle(enabled);
                if (a.player) {
                  Lampa.Player.runas(a.player);
                  params.html.trigger("hover:enter");
                }
                if (a.copylink) {
                  if (extra.quality) {
                    var qual = [];
                    for (var i in extra.quality) {
                      qual.push({
                        title: i,
                        file: extra.quality[i],
                      });
                    }
                    Lampa.Select.show({
                      title: Lampa.Lang.translate("settings_server_links"),
                      items: qual,
                      onBack: function onBack() {
                        Lampa.Controller.toggle(enabled);
                      },
                      onSelect: function onSelect(b) {
                        Lampa.Utils.copyTextToClipboard(
                          b.file,
                          function () {
                            Lampa.Noty.show(
                              Lampa.Lang.translate("copy_secuses"),
                            );
                          },
                          function () {
                            Lampa.Noty.show(Lampa.Lang.translate("copy_error"));
                          },
                        );
                      },
                    });
                  } else {
                    Lampa.Utils.copyTextToClipboard(
                      extra.file,
                      function () {
                        Lampa.Noty.show(Lampa.Lang.translate("copy_secuses"));
                      },
                      function () {
                        Lampa.Noty.show(Lampa.Lang.translate("copy_error"));
                      },
                    );
                  }
                }
                if (a.subscribe) {
                  Lampa.Account.subscribeToTranslation(
                    {
                      card: object.movie,
                      season: params.element.season,
                      episode: params.element.translate_episode_end,
                      voice: params.element.translate_voice,
                    },
                    function () {
                      Lampa.Noty.show(
                        Lampa.Lang.translate("lampac_voice_success"),
                      );
                    },
                    function () {
                      Lampa.Noty.show(
                        Lampa.Lang.translate("lampac_voice_error"),
                      );
                    },
                  );
                }
              },
            });
          }
          params.onFile(show);
        })
        .on("hover:focus", function () {
          if (Lampa.Helper)
            Lampa.Helper.show(
              "online_file",
              Lampa.Lang.translate("helper_online_file"),
              params.html,
            );
        });
    };
    /**
     * Показать пустой результат
     */
    this.empty = function () {
      var html = Lampa.Template.get("lampac_does_not_answer", {});
      html.find(".online-empty__buttons").remove();
      html
        .find(".online-empty__title")
        .text(Lampa.Lang.translate("empty_title_two"));
      html.find(".online-empty__time").text(Lampa.Lang.translate("empty_text"));
      scroll.clear();
      scroll.append(html);
      this.loading(false);
    };
    this.noConnectToServer = function (er) {
      var html = Lampa.Template.get("lampac_does_not_answer", {});
      html.find(".online-empty__buttons").remove();
      html
        .find(".online-empty__title")
        .text(Lampa.Lang.translate("title_error"));
      html
        .find(".online-empty__time")
        .text(
          er && er.accsdb
            ? er.msg
            : Lampa.Lang.translate("lampac_does_not_answer_text").replace(
                "{balanser}",
                currentBalanserName(),
              ),
        );
      scroll.clear();
      scroll.append(html);
      this.loading(false);
    };
    this.doesNotAnswer = function (er) {
      var _this9 = this;
      this.reset();
      var html = Lampa.Template.get("lampac_does_not_answer", {
        balanser: balanser,
      });
      if (er && er.accsdb) html.find(".online-empty__title").html(er.msg);

      var tic = er && er.accsdb ? 10 : 5;
      html.find(".cancel").on("hover:enter", function () {
        clearInterval(balanser_timer);
      });
      html.find(".change").on("hover:enter", function () {
        clearInterval(balanser_timer);
        filter.render().find(".filter--sort").trigger("hover:enter");
      });
      scroll.clear();
      scroll.append(html);
      this.loading(false);
      balanser_timer = setInterval(function () {
        tic--;
        html.find(".timeout").text(tic);
        if (tic == 0) {
          clearInterval(balanser_timer);
          var keys = Lampa.Arrays.getKeys(sources);
          var indx = keys.indexOf(balanser);
          var next = keys[indx + 1];
          if (!next) next = keys[0];
          balanser = next;
          if (Lampa.Activity.active().activity == _this9.activity)
            _this9.changeBalanser(balanser);
        }
      }, 1000);
    };
    this.getLastEpisode = function (items) {
      var last_episode = 0;
      items.forEach(function (e) {
        if (typeof e.episode !== "undefined")
          last_episode = Math.max(last_episode, parseInt(e.episode));
      });
      return last_episode;
    };
    /**
     * Начать навигацию по файлам
     */
    this.start = function () {
      if (Lampa.Activity.active().activity !== this.activity) return;
      if (!initialized) {
        initialized = true;
        this.initialize();
      }
      Lampa.Background.immediately(
        Lampa.Utils.cardImgBackgroundBlur(object.movie),
      );
      Lampa.Controller.add("content", {
        toggle: function toggle() {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        gone: function gone() {
          clearTimeout(balanser_timer);
        },
        up: function up() {
          if (Navigator.canmove("up")) {
            Navigator.move("up");
          } else Lampa.Controller.toggle("head");
        },
        down: function down() {
          Navigator.move("down");
        },
        right: function right() {
          if (Navigator.canmove("right")) Navigator.move("right");
          else filter.show(Lampa.Lang.translate("title_filter"), "filter");
        },
        left: function left() {
          if (Navigator.canmove("left")) Navigator.move("left");
          else Lampa.Controller.toggle("menu");
        },
        back: this.back.bind(this),
      });
      Lampa.Controller.toggle("content");
    };
    this.render = function () {
      return files.render();
    };
    this.back = function () {
      Lampa.Activity.backward();
    };
    this.pause = function () {};
    this.stop = function () {};
    this.destroy = function () {
      if (showyProEntryBanner) showyProEntryBanner.destroy();
      network.clear();
      this.clearTransientRetry();
      this.clearImages();
      files.destroy();
      scroll.destroy();
      clearInterval(balanser_timer);
      clearTimeout(life_wait_timer);
    };
  }

  function addSourceSearch(spiderName, spiderUri) {
    var network = new Lampa.Reguest();

    var source = {
      title: spiderName,
      search: function (params, oncomplite) {
        function searchComplite(links) {
          var keys = Lampa.Arrays.getKeys(links);

          if (keys.length) {
            var status = new Lampa.Status(keys.length);

            status.onComplite = function (result) {
              var rows = [];

              keys.forEach(function (name) {
                var line = result[name];

                if (line && line.data && line.type == "similar") {
                  var cards = line.data.map(function (item) {
                    item.title = Lampa.Utils.capitalizeFirstLetter(item.title);
                    item.release_date = item.year || "0000";
                    item.balanser = spiderUri;
                    if (item.img !== undefined) {
                      if (item.img.charAt(0) === "/")
                        item.img =
                          smotret24InlineSourceBase() +
                          "/" +
                          item.img.substring(1);
                      if (item.img.indexOf("/proxyimg") !== -1)
                        item.img = account(item.img);
                    }

                    return item;
                  });

                  rows.push({
                    title: name,
                    results: cards,
                  });
                }
              });

              oncomplite(rows);
            };

            keys.forEach(function (name) {
              network.silent(
                account(links[name]),
                function (data) {
                  status.append(name, data);
                },
                function () {
                  status.error();
                },
                false,
                {
                  headers: addHeaders(),
                },
              );
            });
          } else {
            oncomplite([]);
          }
        }

        network.silent(
          account(
            Defined.localhost + "lite/" + spiderUri + "?title=" + params.query,
          ),
          function (json) {
            if (json.rch) {
              rchRun(json, function () {
                network.silent(
                  account(
                    Defined.localhost +
                      "lite/" +
                      spiderUri +
                      "?title=" +
                      params.query,
                  ),
                  function (links) {
                    searchComplite(links);
                  },
                  function () {
                    oncomplite([]);
                  },
                  false,
                  {
                    headers: addHeaders(),
                  },
                );
              });
            } else {
              searchComplite(json);
            }
          },
          function () {
            oncomplite([]);
          },
          false,
          {
            headers: addHeaders(),
          },
        );
      },
      onCancel: function () {
        network.clear();
      },
      params: {
        lazy: true,
        align_left: true,
        card_events: {
          onMenu: function () {},
        },
      },
      onMore: function (params, close) {
        close();
      },
      onSelect: function (params, close) {
        close();

        Lampa.Activity.push({
          url: params.element.url,
          title: "Lampac - " + params.element.title,
          component: "smotret24",
          movie: params.element,
          page: 1,
          search: params.element.title,
          clarification: true,
          balanser: params.element.balanser,
          noinfo: true,
        });
      },
    };

    Lampa.Search.addSource(source);
  }

  function startPlugin() {
    window.smotret24_plugin = true;
    var manifst = {
      type: "video",
      version: "",
      name: "Пиво",
      description: "Плагин для просмотра онлайн сериалов и фильмов",
      component: "smotret24",
      onContextMenu: function onContextMenu(object) {
        return {
          name: Lampa.Lang.translate("lampac_watch"),
          description: "",
        };
      },
      onContextLauch: function onContextLauch(object) {
        resetTemplates();
        Lampa.Component.add("smotret24", component);

        var id = Lampa.Utils.hash(
          object.number_of_seasons
            ? object.original_name
            : object.original_title,
        );
        var all = Lampa.Storage.get("clarification_search", "{}");

        Lampa.Activity.push({
          url: "",
          title: Lampa.Lang.translate("title_online"),
          component: "smotret24",
          search: all[id] ? all[id] : object.title,
          search_one: object.title,
          search_two: object.original_title,
          movie: object,
          page: 1,
          clarification: all[id] ? true : false,
        });
      },
    };
    Lampa.Manifest.plugins = manifst;
    Lampa.Lang.add({
      lampac_watch: {
        //
        ru: "Смотреть онлайн",
        en: "Watch online",
        uk: "Дивитися онлайн",
        zh: "在线观看",
      },
      lampac_video: {
        //
        ru: "Видео",
        en: "Video",
        uk: "Відео",
        zh: "视频",
      },
      lampac_no_watch_history: {
        ru: "Нет истории просмотра",
        en: "No browsing history",
        ua: "Немає історії перегляду",
        zh: "没有浏览历史",
      },
      lampac_nolink: {
        ru: "Не удалось извлечь ссылку",
        uk: "Неможливо отримати посилання",
        en: "Failed to fetch link",
        zh: "获取链接失败",
      },
      lampac_balanser: {
        //
        ru: "Источник",
        uk: "Джерело",
        en: "Source",
        zh: "来源",
      },
      helper_online_file: {
        //
        ru: 'Удерживайте клавишу "ОК" для вызова контекстного меню',
        uk: 'Утримуйте клавішу "ОК" для виклику контекстного меню',
        en: 'Hold the "OK" key to bring up the context menu',
        zh: "按住“确定”键调出上下文菜单",
      },
      title_online: {
        //
        ru: "Онлайн",
        uk: "Онлайн",
        en: "Online",
        zh: "在线的",
      },
      lampac_voice_subscribe: {
        //
        ru: "Подписаться на перевод",
        uk: "Підписатися на переклад",
        en: "Subscribe to translation",
        zh: "订阅翻译",
      },
      lampac_voice_success: {
        //
        ru: "Вы успешно подписались",
        uk: "Ви успішно підписалися",
        en: "You have successfully subscribed",
        zh: "您已成功订阅",
      },
      lampac_voice_error: {
        //
        ru: "Возникла ошибка",
        uk: "Виникла помилка",
        en: "An error has occurred",
        zh: "发生了错误",
      },
      lampac_clear_all_marks: {
        //
        ru: "Очистить все метки",
        uk: "Очистити всі мітки",
        en: "Clear all labels",
        zh: "清除所有标签",
      },
      lampac_clear_all_timecodes: {
        //
        ru: "Очистить все тайм-коды",
        uk: "Очистити всі тайм-коди",
        en: "Clear all timecodes",
        zh: "清除所有时间代码",
      },
      lampac_change_balanser: {
        //
        ru: "Изменить балансер",
        uk: "Змінити балансер",
        en: "Change balancer",
        zh: "更改平衡器",
      },
      lampac_balanser_dont_work: {
        //
        ru: "Поиск на ({balanser}) не дал результатов",
        uk: "Пошук на ({balanser}) не дав результатів",
        en: "Search on ({balanser}) did not return any results",
        zh: "搜索 ({balanser}) 未返回任何结果",
      },
      lampac_balanser_timeout: {
        //
        ru: 'Источник будет переключен автоматически через <span class="timeout">10</span> секунд.',
        uk: 'Джерело буде автоматично переключено через <span class="timeout">10</span> секунд.',
        en: 'The source will be switched automatically after <span class="timeout">10</span> seconds.',
        zh: '平衡器将在<span class="timeout">10</span>秒内自动切换。',
      },
      lampac_does_not_answer_text: {
        ru: "Поиск на ({balanser}) не дал результатов",
        uk: "Пошук на ({balanser}) не дав результатів",
        en: "Search on ({balanser}) did not return any results",
        zh: "搜索 ({balanser}) 未返回任何结果",
      },
    });
    Lampa.Template.add(
      "lampac_css",
      "\n        <style>\n        @charset 'UTF-8';.online-prestige{position:relative;-webkit-border-radius:.3em;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-prestige__body{padding:1.2em;line-height:1.3;-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;position:relative}@media screen and (max-width:480px){.online-prestige__body{padding:.8em 1.2em}}.online-prestige__img{position:relative;width:13em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;min-height:8.2em}.online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;-o-object-fit:cover;object-fit:cover;-webkit-border-radius:.3em;border-radius:.3em;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.online-prestige__img--loaded>img{opacity:1}@media screen and (max-width:480px){.online-prestige__img{width:7em;min-height:6em}}.online-prestige__folder{padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige__folder>svg{width:4.4em !important;height:4.4em !important}.online-prestige__viewed{position:absolute;top:1em;left:1em;background:rgba(0,0,0,0.45);-webkit-border-radius:100%;border-radius:100%;padding:.25em;font-size:.76em}.online-prestige__viewed>svg{width:1.5em !important;height:1.5em !important}.online-prestige__episode-number{position:absolute;top:0;left:0;right:0;bottom:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;font-size:2em}.online-prestige__loader{position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center center;-webkit-background-size:contain;-o-background-size:contain;background-size:contain}.online-prestige__head,.online-prestige__footer{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige__timeline{margin:.8em 0}.online-prestige__timeline>.time-line{display:block !important}.online-prestige__title{font-size:1.7em;overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}@media screen and (max-width:480px){.online-prestige__title{font-size:1.4em}}.online-prestige__time{padding-left:2em}.online-prestige__info{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige__info>*{overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}.online-prestige__quality{padding-left:1em;white-space:nowrap}.online-prestige__scan-file{position:absolute;bottom:0;left:0;right:0}.online-prestige__scan-file .broadcast__scan{margin:0}.online-prestige .online-prestige-split{font-size:.8em;margin:0 1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige.focus::after{content:'';position:absolute;top:-0.6em;left:-0.6em;right:-0.6em;bottom:-0.6em;-webkit-border-radius:.7em;border-radius:.7em;border:solid .3em #fff;z-index:-1;pointer-events:none}.online-prestige+.online-prestige{margin-top:1.5em}.online-prestige--folder .online-prestige__footer{margin-top:.8em}.online-prestige-watched{padding:1em}.online-prestige-watched__icon>svg{width:1.5em;height:1.5em}.online-prestige-watched__body{padding-left:1em;padding-top:.1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap}.online-prestige-watched__body>span+span::before{content:' ● ';vertical-align:top;display:inline-block;margin:0 .5em}.online-prestige-rate{display:-webkit-inline-box;display:-webkit-inline-flex;display:-moz-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige-rate>svg{width:1.3em !important;height:1.3em !important}.online-prestige-rate>span{font-weight:600;font-size:1.1em;padding-left:.7em}.online-empty{line-height:1.4}.online-empty__title{font-size:1.8em;margin-bottom:.3em}.online-empty__time{font-size:1.2em;font-weight:300;margin-bottom:1.6em}.online-empty__buttons{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-empty__buttons>*+*{margin-left:1em}.online-empty__button{background:rgba(0,0,0,0.3);font-size:1.2em;padding:.5em 1.2em;-webkit-border-radius:.2em;border-radius:.2em;margin-bottom:2.4em}.online-empty__button.focus{background:#fff;color:black}.online-empty__templates .online-empty-template:nth-child(2){opacity:.5}.online-empty__templates .online-empty-template:nth-child(3){opacity:.2}.online-empty-template{background-color:rgba(255,255,255,0.3);padding:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-border-radius:.3em;border-radius:.3em}.online-empty-template>*{background:rgba(0,0,0,0.3);-webkit-border-radius:.3em;border-radius:.3em}.online-empty-template__ico{width:4em;height:4em;margin-right:2.4em}.online-empty-template__body{height:1.7em;width:70%}.online-empty-template+.online-empty-template{margin-top:1em}\n        </style>\n    ",
    );
    $("body").append(Lampa.Template.get("lampac_css", {}, true));

    function resetTemplates() {
      Lampa.Template.add(
        "lampac_prestige_full",
        '<div class="online-prestige online-prestige--full selector">\n            <div class="online-prestige__img">\n                <img alt="">\n                <div class="online-prestige__loader"></div>\n            </div>\n            <div class="online-prestige__body">\n                <div class="online-prestige__head">\n                    <div class="online-prestige__title">{title}</div>\n                    <div class="online-prestige__time">{time}</div>\n                </div>\n\n                <div class="online-prestige__timeline"></div>\n\n                <div class="online-prestige__footer">\n                    <div class="online-prestige__info">{info}</div>\n                    <div class="online-prestige__quality">{quality}</div>\n                </div>\n            </div>\n        </div>',
      );
      Lampa.Template.add(
        "lampac_content_loading",
        '<div class="online-empty">\n            <div class="broadcast__scan"><div></div></div>\n\t\t\t\n            <div class="online-empty__templates">\n                <div class="online-empty-template selector">\n                    <div class="online-empty-template__ico"></div>\n                    <div class="online-empty-template__body"></div>\n                </div>\n                <div class="online-empty-template">\n                    <div class="online-empty-template__ico"></div>\n                    <div class="online-empty-template__body"></div>\n                </div>\n                <div class="online-empty-template">\n                    <div class="online-empty-template__ico"></div>\n                    <div class="online-empty-template__body"></div>\n                </div>\n            </div>\n        </div>',
      );
      Lampa.Template.add(
        "lampac_does_not_answer",
        '<div class="online-empty">\n            <div class="online-empty__title">\n                #{lampac_balanser_dont_work}\n            </div>\n            <div class="online-empty__time">\n                #{lampac_balanser_timeout}\n            </div>\n            <div class="online-empty__buttons">\n                <div class="online-empty__button selector cancel">#{cancel}</div>\n                <div class="online-empty__button selector change">#{lampac_change_balanser}</div>\n            </div>\n            <div class="online-empty__templates">\n                <div class="online-empty-template">\n                    <div class="online-empty-template__ico"></div>\n                    <div class="online-empty-template__body"></div>\n                </div>\n                <div class="online-empty-template">\n                    <div class="online-empty-template__ico"></div>\n                    <div class="online-empty-template__body"></div>\n                </div>\n                <div class="online-empty-template">\n                    <div class="online-empty-template__ico"></div>\n                    <div class="online-empty-template__body"></div>\n                </div>\n            </div>\n        </div>',
      );
      Lampa.Template.add(
        "lampac_prestige_rate",
        '<div class="online-prestige-rate">\n            <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">\n                <path d="M8.39409 0.192139L10.99 5.30994L16.7882 6.20387L12.5475 10.4277L13.5819 15.9311L8.39409 13.2425L3.20626 15.9311L4.24065 10.4277L0 6.20387L5.79819 5.30994L8.39409 0.192139Z" fill="#fff"></path>\n            </svg>\n            <span>{rate}</span>\n        </div>',
      );
      Lampa.Template.add(
        "lampac_prestige_folder",
        '<div class="online-prestige online-prestige--folder selector">\n            <div class="online-prestige__folder">\n                <svg viewBox="0 0 128 112" fill="none" xmlns="http://www.w3.org/2000/svg">\n                    <rect y="20" width="128" height="92" rx="13" fill="white"></rect>\n                    <path d="M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z" fill="white" fill-opacity="0.23"></path>\n                    <rect x="11" y="8" width="106" height="76" rx="13" fill="white" fill-opacity="0.51"></rect>\n                </svg>\n            </div>\n            <div class="online-prestige__body">\n                <div class="online-prestige__head">\n                    <div class="online-prestige__title">{title}</div>\n                    <div class="online-prestige__time">{time}</div>\n                </div>\n\n                <div class="online-prestige__footer">\n                    <div class="online-prestige__info">{info}</div>\n                </div>\n            </div>\n        </div>',
      );
      Lampa.Template.add(
        "lampac_prestige_watched",
        '<div class="online-prestige online-prestige-watched selector">\n            <div class="online-prestige-watched__icon">\n                <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">\n                    <circle cx="10.5" cy="10.5" r="9" stroke="currentColor" stroke-width="3"/>\n                    <path d="M14.8477 10.5628L8.20312 14.399L8.20313 6.72656L14.8477 10.5628Z" fill="currentColor"/>\n                </svg>\n            </div>\n            <div class="online-prestige-watched__body">\n                \n            </div>\n        </div>',
      );
    }
    var button =
      '<div class="full-start__button selector view--online smotret24--button" data-subtitle="'
        .concat(manifst.name, " ")
        .concat(
          manifst.version,
          '">\n        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 392.697 392.697" xml:space="preserve">\n            <path d="M21.837,83.419l36.496,16.678L227.72,19.886c1.229-0.592,2.002-1.846,1.98-3.209c-0.021-1.365-0.834-2.592-2.082-3.145\n                L197.766,0.3c-0.903-0.4-1.933-0.4-2.837,0L21.873,77.036c-1.259,0.559-2.073,1.803-2.081,3.18\n                C19.784,81.593,20.584,82.847,21.837,83.419z" fill="currentColor"></path>\n            <path d="M185.689,177.261l-64.988-30.01v91.617c0,0.856-0.44,1.655-1.167,2.114c-0.406,0.257-0.869,0.386-1.333,0.386\n                c-0.368,0-0.736-0.082-1.079-0.244l-68.874-32.625c-0.869-0.416-1.421-1.293-1.421-2.256v-92.229L6.804,95.5\n                c-1.083-0.496-2.344-0.406-3.347,0.238c-1.002,0.645-1.608,1.754-1.608,2.944v208.744c0,1.371,0.799,2.615,2.045,3.185\n                l178.886,81.768c0.464,0.211,0.96,0.315,1.455,0.315c0.661,0,1.318-0.188,1.892-0.555c1.002-0.645,1.608-1.754,1.608-2.945\n                V180.445C187.735,179.076,186.936,177.831,185.689,177.261z" fill="currentColor"></path>\n            <path d="M389.24,95.74c-1.002-0.644-2.264-0.732-3.347-0.238l-178.876,81.76c-1.246,0.57-2.045,1.814-2.045,3.185v208.751\n                c0,1.191,0.606,2.302,1.608,2.945c0.572,0.367,1.23,0.555,1.892,0.555c0.495,0,0.991-0.104,1.455-0.315l178.876-81.768\n                c1.246-0.568,2.045-1.813,2.045-3.185V98.685C390.849,97.494,390.242,96.384,389.24,95.74z" fill="currentColor"></path>\n            <path d="M372.915,80.216c-0.009-1.377-0.823-2.621-2.082-3.18l-60.182-26.681c-0.938-0.418-2.013-0.399-2.938,0.045\n                l-173.755,82.992l60.933,29.117c0.462,0.211,0.958,0.316,1.455,0.316s0.993-0.105,1.455-0.316l173.066-79.092\n                C372.122,82.847,372.923,81.593,372.915,80.216z" fill="currentColor"></path>\n        </svg>\n\n        <span>Смотреть!</span>\n    </div>',
        ); // нужна заглушка, а то при страте лампы говорит пусто
    Lampa.Component.add("smotret24", component); //то же самое
    resetTemplates();

    function addButton(e) {
      if (e.render.find(".smotret24--button").length) return;
      var btn = $(Lampa.Lang.translate(button));
      // //console.log(btn.clone().removeClass('focus').prop('outerHTML'))
      btn.on("hover:enter", function () {
        resetTemplates();
        Lampa.Component.add("smotret24", component);

        var id = Lampa.Utils.hash(
          e.movie.number_of_seasons
            ? e.movie.original_name
            : e.movie.original_title,
        );
        var all = Lampa.Storage.get("clarification_search", "{}");

        Lampa.Activity.push({
          url: "",
          title: Lampa.Lang.translate("title_online"),
          component: "smotret24",
          search: all[id] ? all[id] : e.movie.title,
          search_one: e.movie.title,
          search_two: e.movie.original_title,
          movie: e.movie,
          page: 1,
          clarification: all[id] ? true : false,
        });
      });
      e.render.after(btn);
    }
    Lampa.Listener.follow("full", function (e) {
      if (e.type == "complite") {
        addButton({
          render: e.object.activity.render().find(".view--torrent"),
          movie: e.data.movie,
        });
      }
    });
    try {
      if (Lampa.Activity.active().component == "full") {
        addButton({
          render: Lampa.Activity.active()
            .activity.render()
            .find(".view--torrent"),
          movie: Lampa.Activity.active().card,
        });
      }
    } catch (e) {}
    if (Lampa.Manifest.app_digital >= 177) {
      var balansers_sync = [
        "filmix",
        "filmixtv",
        "fxapi",
        "filmixrezka",
        "rezka",
        "pizdatoehd",
        "getstv",
        "kinopub",
        "zetflixdb",
        "collaps",
        "hdvb",
        "kodik",
        "bamboo",
        "eneyida",
        "kinoukr",
        "uafilm",
        "uakino",
        "kinotochka",
        "remux",
        "anilibria",
        "animedia",
        "animego",
        "animevost",
        "animebesst",
        "alloha",
        "mirage",
        "phantom",
        "animelib",
        "moonanime",
        "vibix",
        "fancdn",
        "cdnvideohub",
        "vokino",
        "hydraflix",
        "videasy",
        "vidsrc",
        "movpi",
        "vidlink",
        "smashystream",
        "autoembed",
        "pidtor",
        "videoseed",
        "iptvonline",
        "veoveo",
        "kinoflix",
        "leproduction",
        "vkmovie",
        "videoseed",
        "veoveo",
        "kinogo",
        "kinobase",
        "fancdn",
        "asiage",
        "geosaitebi",
        "mikai",
        "dreamerscast",
      ];
      balansers_sync.forEach(function (name) {
        Lampa.Storage.sync("online_choice_" + name, "object_object");
      });
      Lampa.Storage.sync("online_watched_last", "object_object");
    }
  }
  if (!window.smotret24_plugin) startPlugin();

  function smotret24RuStartLifecycleTrials() {
    var apiBase = "http://87.120.126.125:8001";

    function startRuntime() {
      if (!window.ShowyMarketingRuntime) return;
      smotret24InlineRegisterSourceAdapter();
      window.ShowyMarketingRuntime.start({
        apiBase: apiBase,
        component: "smotret24_ru",
        trialSecurityVersion: 2,
      });
    }

    if (window.ShowyMarketingRuntime) {
      startRuntime();
    } else if (Lampa.Utils && Lampa.Utils.putScript) {
      Lampa.Utils.putScript(
        [apiBase + "/marketing-runtime.js?v=20260722-1"],
        startRuntime,
        false,
        function () {},
      );
    }
  }

  setTimeout(smotret24RuStartLifecycleTrials, 0);
})();

/* BEGIN LAMPAC VOICE PRIORITY V1 */
(function () {
  "use strict";

  var INSTALL_MARKER = "__lampacVoicePriorityV1";
  var RETRY_LIMIT = 120;
  var retryCount = 0;

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/&(?:nbsp|amp);/g, " ")
      .replace(/[^a-zа-я0-9]+/g, " ")
      .replace(/^\s+|\s+$/g, "")
      .replace(/\s+/g, " ");
  }

  function compact(value) {
    return normalize(value).replace(/\s+/g, "");
  }

  function voiceRank(title) {
    var normalized = normalize(title);
    var joined = compact(title);

    // Explicitly ad-heavy studios always go below neutral entries.
    if (
      joined.indexOf("coldfilm") !== -1 ||
      joined.indexOf("колдфильм") !== -1 ||
      joined.indexOf("rudub") !== -1 ||
      joined.indexOf("рудуб") !== -1 ||
      joined.indexOf("рудаб") !== -1 ||
      joined.indexOf("ultradox") !== -1 ||
      joined.indexOf("ультрадокс") !== -1
    ) {
      return 1000;
    }

    if (joined.indexOf("lostfilm") !== -1 || joined.indexOf("лостфильм") !== -1)
      return 0;
    if (joined.indexOf("hdrezka") !== -1 || joined.indexOf("хдрезка") !== -1)
      return 10;
    if (joined.indexOf("tvshows") !== -1 || joined.indexOf("твшоус") !== -1)
      return 20;

    if (
      /(^| )(дубляж|дублированный|дублированная|дублированное|дублировано)( |$)/.test(
        normalized,
      ) ||
      normalized.indexOf("официальный дубляж") !== -1 ||
      normalized.indexOf("полное дублирование") !== -1
    ) {
      return 30;
    }

    return 500;
  }

  function isVoiceMenu(object) {
    if (!object || !Array.isArray(object.items) || object.items.length < 2)
      return false;

    var title = normalize(object.title);
    return (
      title.indexOf("перевод") !== -1 ||
      title.indexOf("озвуч") !== -1 ||
      title === "voice" ||
      title.indexOf("translation") !== -1
    );
  }

  function isFixedItem(item) {
    return (
      !item ||
      item.separator ||
      item.reset ||
      item.noenter ||
      typeof item.title !== "string"
    );
  }

  function sortItems(items) {
    var result = items.slice();
    var positions = [];
    var movable = [];

    for (var i = 0; i < items.length; i++) {
      if (isFixedItem(items[i])) continue;
      positions.push(i);
      movable.push({
        item: items[i],
        position: i,
        rank: voiceRank(items[i].title),
      });
    }

    movable.sort(function (left, right) {
      if (left.rank !== right.rank) return left.rank - right.rank;
      return left.position - right.position;
    });

    for (var j = 0; j < positions.length; j++)
      result[positions[j]] = movable[j].item;
    return result;
  }

  function install() {
    if (
      !window.Lampa ||
      !Lampa.Select ||
      typeof Lampa.Select.show !== "function"
    )
      return false;
    if (Lampa.Select.show[INSTALL_MARKER]) return true;

    var originalShow = Lampa.Select.show;
    var wrappedShow = function (object) {
      try {
        if (isVoiceMenu(object)) object.items = sortItems(object.items);
      } catch (error) {
        if (window.console && console.warn)
          console.warn("VoicePriority", error);
      }

      return originalShow.call(this, object);
    };

    wrappedShow[INSTALL_MARKER] = true;
    wrappedShow.original = originalShow;
    Lampa.Select.show = wrappedShow;
    window[INSTALL_MARKER] = true;
    return true;
  }

  if (!install()) {
    var timer = setInterval(function () {
      retryCount++;
      if (install() || retryCount >= RETRY_LIMIT) clearInterval(timer);
    }, 250);
  }
})();
/* END LAMPAC VOICE PRIORITY V1 */
