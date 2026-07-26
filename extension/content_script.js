(function () {
  function log(text) {
    chrome.runtime.sendMessage({ action: "log", text });
  }

  function fillAndDispatch(el, value) {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findSubmitButton() {
    return (
      document.querySelector('button[name="_eventId_proceed"]') ||
      document.querySelector('input[name="_eventId_proceed"]') ||
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]')
    );
  }

  const SSO_KEYWORDS = ["single sign", "sso", "rwth login", "login via rwth"];

  function clickSSOLink() {
    const el = Array.from(document.querySelectorAll("a, button")).find((node) => {
      const text = node.textContent.trim().toLowerCase();
      return text && SSO_KEYWORDS.some((k) => text.includes(k));
    });
    if (el) {
      log(`发现登录入口"${el.textContent.trim()}"，自动点击`);
      el.click();
      return true;
    }
    return false;
  }

  function handleCredentialsPage() {
    const username = document.querySelector(
      '#username, input[name="j_username"], input[autocomplete="username"]'
    );
    const password = document.querySelector(
      '#password, input[name="j_password"], input[type="password"]'
    );
    if (!username || !password || username.value) return false;

    chrome.runtime.sendMessage({ action: "get_credentials" }, (resp) => {
      if (!resp || resp.error) {
        log(`获取账号密码失败: ${resp && resp.error}`);
        return;
      }
      fillAndDispatch(username, resp.username);
      fillAndDispatch(password, resp.password);
      log("自动填写账号密码");
      const btn = findSubmitButton();
      if (btn) btn.click();
    });
    return true;
  }

  function handleTokenSelectPage() {
    const select = document.querySelector("select");
    if (!select) return false;
    const target = Array.from(select.options).find((o) =>
      o.textContent.toLowerCase().includes("selfload")
    );
    if (!target) return false;

    select.value = target.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    log(`自动选择令牌: ${target.textContent.trim()}`);
    const btn = findSubmitButton();
    if (btn) btn.click();
    return true;
  }

  function handleOtpPage() {
    const otpField = document.querySelector(
      '#otc, input[name="j_tokenNumber"], input[name="otp"], input[autocomplete="one-time-code"]'
    );
    if (!otpField || otpField.value) return false;

    chrome.runtime.sendMessage({ action: "get_totp" }, (resp) => {
      if (!resp || resp.error) {
        log(`获取验证码失败: ${resp && resp.error}`);
        return;
      }
      fillAndDispatch(otpField, resp.code);
      log("自动填写 TOTP 验证码");
      const btn = findSubmitButton();
      if (btn) btn.click();
    });
    return true;
  }

  function run() {
    if (location.hostname === "sso.rwth-aachen.de") {
      if (handleCredentialsPage()) return;
      if (handleTokenSelectPage()) return;
      if (handleOtpPage()) return;
      return;
    }
    // 任意 *.rwth-aachen.de 页面：只要出现 SSO/登录入口就自动点进去
    clickSSOLink();
  }

  run();
})();
