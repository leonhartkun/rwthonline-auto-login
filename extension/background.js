import { rwth_host_from_url } from "./log_host.mjs";

const MAX_LOG_ENTRIES = 50;
const MAX_NATIVE_TIMINGS = 20;
const NATIVE_HOST = "com.rwthonline.auto_login";
let native_port;
let next_native_request_id = 0;
const pending_native_requests = new Map();

async function appendLog(text, url) {
  const { log = [] } = await chrome.storage.local.get("log");
  log.unshift({ time: Date.now(), text, url: rwth_host_from_url(url) });
  await chrome.storage.local.set({ log: log.slice(0, MAX_LOG_ENTRIES) });
}

async function appendNativeTiming(action, elapsed_ms, reused_port) {
  const { native_timing = [] } = await chrome.storage.local.get("native_timing");
  native_timing.unshift({ time: Date.now(), action, elapsed_ms, reused_port });
  await chrome.storage.local.set({ native_timing: native_timing.slice(0, MAX_NATIVE_TIMINGS) });
}

function native_message(message) {
  return new Promise((resolve) => {
    const started_at = performance.now();
    const request_id = String(++next_native_request_id);
    try {
      const reused_port = Boolean(native_port);
      const port = get_native_port();
      pending_native_requests.set(request_id, (response) => {
        appendNativeTiming(message.action, Math.round(performance.now() - started_at), reused_port)
          .catch(() => {});
        resolve(response);
      });
      port.postMessage({ ...message, request_id });
    } catch (error) {
      appendNativeTiming(message.action, Math.round(performance.now() - started_at), false)
        .catch(() => {});
      resolve({ error: `无法连接本机助手：${error.message}` });
    }
  });
}

function get_native_port() {
  if (native_port) return native_port;

  native_port = chrome.runtime.connectNative(NATIVE_HOST);
  native_port.onMessage.addListener((response) => {
    const resolve = pending_native_requests.get(response?.request_id);
    if (!resolve) return;
    pending_native_requests.delete(response.request_id);
    const { request_id: _request_id, ...payload } = response;
    resolve(payload);
  });
  native_port.onDisconnect.addListener(() => {
    const message = chrome.runtime.lastError?.message || "本机助手连接已关闭。";
    for (const resolve of pending_native_requests.values()) {
      resolve({ error: `无法连接本机助手：${message}` });
    }
    pending_native_requests.clear();
    native_port = undefined;
  });
  return native_port;
}

async function warm_native_helper() {
  await native_message({ action: "get_login_data" });
}

async function get_login_data(message) {
  const response = await native_message(message);
  if (!response || response.error) return response;
  const { token_label } = await chrome.storage.local.get("token_label");
  return { ...response, token_label: response.token_label || token_label };
}

chrome.runtime.onStartup.addListener(() => {
  warm_native_helper().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, send_response) => {
  (async () => {
    if (message.action === "log") {
      await appendLog(message.text, sender.url);
      send_response({ ok: true });
      return;
    }

    if (message.action === "get_login_data" || message.action === "get_credentials") {
      send_response(await get_login_data(message));
      return;
    }

    if (message.action === "get_token_label") {
      const { token_label } = await chrome.storage.local.get("token_label");
      send_response({ token_label: token_label || "Selfload" });
      return;
    }

    if (message.action === "get_totp") {
      send_response(await native_message(message));
      return;
    }

    if (message.action === "open_onboarding") {
      await chrome.runtime.openOptionsPage();
      send_response({ ok: true });
      return;
    }

    if (message.action === "close_onboarding") {
      if (sender.tab?.id) {
        await chrome.tabs.remove(sender.tab.id);
      }
      send_response({ ok: true });
      return;
    }

    if (message.action === "configure_credentials" || message.action === "import_token_qr" || message.action === "get_imported_totp") {
      const response = await native_message(message);
      if (response?.ok && message.action === "configure_credentials") {
        await chrome.storage.local.set({ token_label: message.token_label });
      }
      send_response(response);
      return;
    }

    if (message.action === "get_helper_status") {
      send_response(await native_message(message));
      return;
    }

    if (message.action === "warm_native_helper") {
      await warm_native_helper();
      send_response({ ok: true });
      return;
    }

    send_response({ error: "Unknown extension action." });
  })().catch((error) => send_response({ error: error.message }));
  return true;
});
