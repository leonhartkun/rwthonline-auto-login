function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString("zh-CN", { hour12: false });
}

function urlHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "";
  }
}

chrome.storage.local.get("log", ({ log = [] }) => {
  const ul = document.getElementById("log");
  if (log.length === 0) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "还没有记录，访问 RWTH 相关网站后会显示在这里";
    ul.append(item);
    return;
  }
  for (const entry of log) {
    const item = document.createElement("li");
    const time = document.createElement("div");
    time.className = "time";
    time.textContent = `${formatTime(entry.time)} · ${urlHost(entry.url)}`;
    item.append(time, document.createTextNode(entry.text));
    ul.append(item);
  }
});

document.getElementById("open_onboarding").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "open_onboarding" });
});
