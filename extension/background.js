import { rwth_host_from_url } from "./log_host.mjs";

const MAX_LOG_ENTRIES = 50;
const NATIVE_HOST = "com.rwthonline.auto_login";
let native_port;
let next_native_request_id = 0;
const pending_native_requests = new Map();

async function appendLog(text, url) {
  const { log = [] } = await chrome.storage.local.get("log");
  log.unshift({ time: Date.now(), text, url: rwth_host_from_url(url) });
  await chrome.storage.local.set({ log: log.slice(0, MAX_LOG_ENTRIES) });
}

function native_message(message) {
  return new Promise((resolve) => {
    const request_id = String(++next_native_request_id);
    try {
      const port = get_native_port();
      pending_native_requests.set(request_id, resolve);
      port.postMessage({ ...message, request_id });
    } catch (error) {
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

chrome.runtime.onMessage.addListener((message, sender, send_response) => {
  (async () => {
    if (message.action === "log") {
      await appendLog(message.text, sender.url);
      send_response({ ok: true });
      return;
    }

    if (message.action === "get_credentials") {
      send_response(await native_message(message));
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

    if (message.action === "configure_credentials" || message.action === "get_helper_status") {
      send_response(await native_message(message));
      return;
    }

    send_response({ error: "Unknown extension action." });
  })().catch((error) => send_response({ error: error.message }));
  return true;
});
