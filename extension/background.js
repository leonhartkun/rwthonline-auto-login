import { rwth_host_from_url } from "./log_host.mjs";

const MAX_LOG_ENTRIES = 50;
const NATIVE_HOST = "com.rwthonline.auto_login";

async function appendLog(text, url) {
  const { log = [] } = await chrome.storage.local.get("log");
  log.unshift({ time: Date.now(), text, url: rwth_host_from_url(url) });
  await chrome.storage.local.set({ log: log.slice(0, MAX_LOG_ENTRIES) });
}

function native_message(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ error: `无法连接本机助手：${chrome.runtime.lastError.message}` });
        return;
      }
      resolve(response || { error: "本机助手没有返回结果。" });
    });
  });
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
