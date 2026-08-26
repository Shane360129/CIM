/*
 * CIM — 私密即時聊天 (end-to-end encrypted, serverless chat)
 *
 * How privacy works:
 *  - The room key is a random secret kept in the URL fragment (#...).
 *    Fragments are NEVER sent to any server (not to GitHub, not to the broker).
 *  - Every message is encrypted in the browser with AES-256-GCM before it
 *    leaves your device. The key is derived from the URL secret via HKDF.
 *  - The MQTT topic is a SHA-256 hash of the secret, so the broker cannot
 *    even tell which room is which, and can never read message contents.
 *  - Result: only people you send the link to can find the room or read it.
 *
 * Transport is intentionally pluggable (see Transport interface below), so
 * you can swap the public MQTT broker for Firebase or anything else without
 * touching the crypto or UI. See README.md.
 */
(function () {
  "use strict";

  // ---- Config ---------------------------------------------------------------
  // Public MQTT brokers over secure WebSocket (WSS). Tried in order; if the
  // first can't connect, the app falls back to the next automatically.
  var BROKERS = [
    "wss://broker.emqx.io:8084/mqtt",
    "wss://broker.hivemq.com:8884/mqtt",
  ];
  var APP_TAG = "cim-v1"; // salt/namespace for key + topic derivation
  var HISTORY_LIMIT = 250; // messages kept locally per room
  var TYPING_TTL = 4000; // ms a "typing…" hint stays visible

  var enc = new TextEncoder();
  var dec = new TextDecoder();

  // ---- Small DOM helpers ----------------------------------------------------
  function $(id) { return document.getElementById(id); }
  var els = {
    messages: $("messages"),
    welcome: $("welcome"),
    input: $("input"),
    sendBtn: $("sendBtn"),
    statusDot: $("statusDot"),
    statusText: $("statusText"),
    roomHint: $("roomHint"),
    inviteBtn: $("inviteBtn"),
    nickBtn: $("nickBtn"),
    nickLabel: $("nickLabel"),
    nickDialog: $("nickDialog"),
    nickInput: $("nickInput"),
    typing: $("typing"),
    toast: $("toast"),
  };

  // ---- Base64url ------------------------------------------------------------
  function bytesToB64url(buf) {
    var bytes = new Uint8Array(buf);
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlToBytes(str) {
    str = String(str).replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    var bin = atob(str);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // ---- Crypto ---------------------------------------------------------------
  function getOrCreateSecret() {
    var secret = location.hash.slice(1).trim();
    if (!/^[A-Za-z0-9_-]{16,}$/.test(secret)) {
      var rnd = crypto.getRandomValues(new Uint8Array(32));
      secret = bytesToB64url(rnd);
      history.replaceState(null, "", "#" + secret);
    }
    return secret;
  }

  async function deriveKey(secret) {
    var base = await crypto.subtle.importKey(
      "raw", b64urlToBytes(secret), "HKDF", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: enc.encode(APP_TAG + ":salt"),
        info: enc.encode(APP_TAG + ":aes-gcm"),
      },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function deriveTopic(secret) {
    var digest = await crypto.subtle.digest(
      "SHA-256", enc.encode(APP_TAG + ":topic:" + secret)
    );
    var hex = "";
    var view = new Uint8Array(digest);
    for (var i = 0; i < view.length; i++) hex += view[i].toString(16).padStart(2, "0");
    return "cim/" + hex.slice(0, 32);
  }

  async function encryptJSON(key, obj) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var data = enc.encode(JSON.stringify(obj));
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data);
    var out = new Uint8Array(iv.length + ct.byteLength);
    out.set(iv, 0);
    out.set(new Uint8Array(ct), iv.length);
    return bytesToB64url(out);
  }

  async function decryptJSON(key, b64) {
    var raw = b64urlToBytes(b64);
    var iv = raw.slice(0, 12);
    var ct = raw.slice(12);
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct);
    return JSON.parse(dec.decode(pt));
  }

  // ---- Transport interface --------------------------------------------------
  // A transport moves opaque base64 strings between peers on a shared channel.
  // It knows NOTHING about message contents (they're already encrypted).
  //   connect(), publish(str), close()
  //   onMessage(fn), onStatus(fn)   // status: "connecting" | "online" | "offline"
  function MqttTransport(topic, clientId, willPayload) {
    var handlers = { message: function () {}, status: function () {} };
    var client = null;
    var brokerIdx = 0;
    var connectedOnce = false;
    var failCount = 0;
    var closed = false;

    function build() {
      var url = BROKERS[brokerIdx];
      handlers.status("connecting");
      client = mqtt.connect(url, {
        clientId: "cim_" + clientId + "_" + Math.floor(Math.random() * 1e6),
        clean: true,
        reconnectPeriod: 2500,
        connectTimeout: 9000,
        keepalive: 45,
        will: { topic: topic, payload: willPayload, qos: 0, retain: false },
      });

      client.on("connect", function () {
        connectedOnce = true;
        failCount = 0;
        handlers.status("online");
        client.subscribe(topic, { qos: 0 });
      });
      client.on("reconnect", function () { handlers.status("connecting"); });
      client.on("close", function () { if (!closed) handlers.status("offline"); });
      client.on("offline", function () { handlers.status("offline"); });
      client.on("message", function (t, payload) {
        if (t === topic) handlers.message(payload.toString());
      });
      client.on("error", function () {
        failCount++;
        // Only hop to another broker while we've never managed to connect;
        // once connected, mqtt.js handles transient reconnects itself.
        if (!connectedOnce && failCount >= 2 && BROKERS.length > 1) {
          try { client.end(true); } catch (e) {}
          brokerIdx = (brokerIdx + 1) % BROKERS.length;
          failCount = 0;
          build();
        }
      });
    }

    return {
      connect: function () { build(); },
      publish: function (str) {
        if (client && client.connected) client.publish(topic, str, { qos: 0 });
      },
      close: function () {
        closed = true;
        if (client) { try { client.end(true); } catch (e) {} }
      },
      onMessage: function (fn) { handlers.message = fn; },
      onStatus: function (fn) { handlers.status = fn; },
    };
  }

  // ---- App state ------------------------------------------------------------
  var state = {
    secret: null,
    key: null,
    topic: null,
    clientId: bytesToB64url(crypto.getRandomValues(new Uint8Array(9))),
    nick: loadNick(),
    transport: null,
    seen: new Set(),
    typingTimers: {},
    typingNames: {},
    lastTypingSent: 0,
    stuckToBottom: true,
    joinAnnounced: false,
  };

  function loadNick() {
    var n = "";
    try { n = localStorage.getItem("cim.nick") || ""; } catch (e) {}
    if (!n) n = "訪客-" + Math.floor(1000 + Math.random() * 9000);
    return n;
  }
  function saveNick(n) {
    state.nick = n;
    try { localStorage.setItem("cim.nick", n); } catch (e) {}
    els.nickLabel.textContent = n;
  }

  // ---- Local history --------------------------------------------------------
  function historyKey() { return "cim.hist." + (state.topic || ""); }
  function loadHistory() {
    try {
      var raw = localStorage.getItem(historyKey());
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function persistMessage(m) {
    try {
      var arr = loadHistory();
      arr.push(m);
      if (arr.length > HISTORY_LIMIT) arr = arr.slice(arr.length - HISTORY_LIMIT);
      localStorage.setItem(historyKey(), JSON.stringify(arr));
    } catch (e) {}
  }

  // ---- Rendering ------------------------------------------------------------
  function hideWelcome() {
    if (els.welcome && els.welcome.parentNode) els.welcome.parentNode.removeChild(els.welcome);
  }

  function nearBottom() {
    var m = els.messages;
    return m.scrollHeight - m.scrollTop - m.clientHeight < 80;
  }
  function scrollToBottom(force) {
    if (force || state.stuckToBottom) {
      els.messages.scrollTop = els.messages.scrollHeight;
    }
  }

  function fmtTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }

  // Safe linkify: builds DOM nodes only, never innerHTML.
  var URL_RE = /(https?:\/\/[^\s<]+)/g;
  function appendText(parent, text) {
    var last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement("a");
      a.href = m[0];
      a.textContent = m[0];
      a.target = "_blank";
      a.rel = "noopener noreferrer nofollow";
      parent.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function renderMessage(m, opts) {
    hideWelcome();
    var mine = m.sender === state.clientId;
    var row = document.createElement("div");
    row.className = "row " + (mine ? "me" : "them");

    if (!mine) {
      var meta = document.createElement("div");
      meta.className = "meta";
      var who = document.createElement("span");
      who.className = "who";
      who.textContent = m.nick || "訪客";
      var time = document.createElement("span");
      time.className = "time";
      time.textContent = fmtTime(m.ts);
      meta.appendChild(who);
      meta.appendChild(time);
      row.appendChild(meta);
    } else {
      var metaMe = document.createElement("div");
      metaMe.className = "meta";
      var timeMe = document.createElement("span");
      timeMe.className = "time";
      timeMe.textContent = fmtTime(m.ts);
      metaMe.appendChild(timeMe);
      row.appendChild(metaMe);
    }

    var bubble = document.createElement("div");
    bubble.className = "bubble";
    appendText(bubble, String(m.text));
    row.appendChild(bubble);

    els.messages.appendChild(row);
    if (!opts || !opts.silent) scrollToBottom(mine);
  }

  function renderSystem(text) {
    hideWelcome();
    var el = document.createElement("div");
    el.className = "system";
    el.textContent = text;
    els.messages.appendChild(el);
    scrollToBottom(false);
  }

  // ---- Typing indicator -----------------------------------------------------
  function showTyping(nick, sender) {
    state.typingNames[sender] = nick;
    if (state.typingTimers[sender]) clearTimeout(state.typingTimers[sender]);
    state.typingTimers[sender] = setTimeout(function () {
      delete state.typingNames[sender];
      delete state.typingTimers[sender];
      renderTyping();
    }, TYPING_TTL);
    renderTyping();
  }
  function renderTyping() {
    var names = Object.keys(state.typingNames).map(function (k) { return state.typingNames[k]; });
    if (names.length === 0) {
      els.typing.hidden = true;
      els.typing.textContent = "";
    } else {
      els.typing.hidden = false;
      els.typing.textContent = (names.length === 1 ? names[0] + " 正在輸入…" : names.join("、") + " 正在輸入…");
    }
  }

  // ---- Incoming -------------------------------------------------------------
  async function handleIncoming(raw) {
    var m;
    try {
      m = await decryptJSON(state.key, raw);
    } catch (e) {
      // Not for us / wrong key / corrupt — ignore silently.
      return;
    }
    if (!m || typeof m !== "object") return;
    if (m.sender === state.clientId) return; // our own echo, already shown

    if (m.kind === "typing") {
      showTyping(m.nick || "有人", m.sender);
      return;
    }
    if (m.kind === "join") {
      renderSystem((m.nick || "有人") + " 加入了聊天");
      return;
    }
    if (m.kind === "leave") {
      renderSystem((m.nick || "有人") + " 離開了");
      return;
    }
    if (m.kind === "msg") {
      if (!m.id || state.seen.has(m.id)) return;
      state.seen.add(m.id);
      delete state.typingNames[m.sender];
      renderTyping();
      renderMessage(m);
      persistMessage(m);
    }
  }

  // ---- Outgoing -------------------------------------------------------------
  async function publish(obj) {
    try {
      var payload = await encryptJSON(state.key, obj);
      state.transport.publish(payload);
    } catch (e) {}
  }

  async function sendMessage() {
    var text = els.input.value.replace(/\s+$/, "");
    if (!text) return;
    var msg = {
      kind: "msg",
      id: bytesToB64url(crypto.getRandomValues(new Uint8Array(9))),
      sender: state.clientId,
      nick: state.nick,
      text: text,
      ts: Date.now(),
    };
    state.seen.add(msg.id);
    renderMessage(msg);        // optimistic local render
    persistMessage(msg);
    els.input.value = "";
    autoGrow();
    updateSendBtn();
    await publish(msg);
  }

  function maybeSendTyping() {
    var now = Date.now();
    if (now - state.lastTypingSent < 2000) return;
    state.lastTypingSent = now;
    publish({ kind: "typing", sender: state.clientId, nick: state.nick, ts: now });
  }

  // ---- Invite / share -------------------------------------------------------
  function inviteLink() { return location.href; }
  async function copyInvite() {
    var link = inviteLink();
    try {
      await navigator.clipboard.writeText(link);
      toast("邀請連結已複製 ✓");
    } catch (e) {
      // Fallback for browsers without clipboard permission.
      try {
        els.input.value = link;
        els.input.select();
        document.execCommand("copy");
        els.input.value = "";
        toast("邀請連結已複製 ✓");
      } catch (e2) {
        prompt("複製這條邀請連結：", link);
      }
    }
    autoGrow();
    updateSendBtn();
  }

  function toast(text) {
    els.toast.textContent = text;
    els.toast.hidden = false;
    // force reflow so the transition runs
    void els.toast.offsetWidth;
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      els.toast.classList.remove("show");
      setTimeout(function () { els.toast.hidden = true; }, 220);
    }, 1900);
  }

  // ---- Composer behaviour ---------------------------------------------------
  function autoGrow() {
    var i = els.input;
    i.style.height = "auto";
    i.style.height = Math.min(i.scrollHeight, 140) + "px";
  }
  function updateSendBtn() {
    els.sendBtn.disabled = els.input.value.trim().length === 0;
  }

  // ---- Status ---------------------------------------------------------------
  function setStatus(kind) {
    els.statusDot.className = "dot " + kind;
    els.statusText.textContent =
      kind === "online" ? "已連線 · 端對端加密" :
      kind === "connecting" ? "連線中…" : "已離線 · 重新連線中…";
  }

  // ---- Wire up UI -----------------------------------------------------------
  function bindUI() {
    els.nickLabel.textContent = state.nick;

    els.input.addEventListener("input", function () {
      autoGrow();
      updateSendBtn();
      if (els.input.value.trim()) maybeSendTyping();
    });
    els.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    els.sendBtn.addEventListener("click", sendMessage);
    els.inviteBtn.addEventListener("click", copyInvite);

    els.messages.addEventListener("scroll", function () {
      state.stuckToBottom = nearBottom();
    });

    // Nickname dialog
    els.nickBtn.addEventListener("click", function () {
      els.nickInput.value = state.nick;
      if (typeof els.nickDialog.showModal === "function") els.nickDialog.showModal();
      setTimeout(function () { els.nickInput.focus(); els.nickInput.select(); }, 30);
    });
    els.nickDialog.addEventListener("close", function () {
      if (els.nickDialog.returnValue === "save") {
        var v = (els.nickInput.value || "").trim().slice(0, 24);
        if (v) saveNick(v);
      }
    });

    window.addEventListener("beforeunload", function () {
      if (state.transport) {
        publish({ kind: "leave", sender: state.clientId, nick: state.nick, ts: Date.now() });
        state.transport.close();
      }
    });
  }

  // ---- Boot -----------------------------------------------------------------
  async function boot() {
    if (!window.crypto || !crypto.subtle) {
      renderSystem("此瀏覽器不支援加密功能，請用 HTTPS 開啟（GitHub Pages 已是 HTTPS）。");
      return;
    }
    bindUI();
    setStatus("connecting");

    state.secret = getOrCreateSecret();
    state.key = await deriveKey(state.secret);
    state.topic = await deriveTopic(state.secret);
    els.roomHint.textContent = "房間 " + state.topic.slice(4, 12);

    // Restore local history for this room.
    var hist = loadHistory();
    for (var i = 0; i < hist.length; i++) {
      if (hist[i] && hist[i].id) state.seen.add(hist[i].id);
      renderMessage(hist[i], { silent: true });
    }
    scrollToBottom(true);

    // Pre-compute the encrypted "leave" will so the broker announces departures.
    var willPayload = await encryptJSON(state.key, {
      kind: "leave", sender: state.clientId, nick: state.nick, ts: Date.now(),
    });

    state.transport = MqttTransport(state.topic, state.clientId, willPayload);
    state.transport.onStatus(function (kind) {
      setStatus(kind);
      if (kind === "online" && !state.joinAnnounced) {
        state.joinAnnounced = true;
        publish({ kind: "join", sender: state.clientId, nick: state.nick, ts: Date.now() });
      }
    });
    state.transport.onMessage(handleIncoming);
    state.transport.connect();

    updateSendBtn();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
