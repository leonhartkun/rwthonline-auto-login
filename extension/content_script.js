(function () {
  function log(text) {
    chrome.runtime.sendMessage({ action: "log", text });
  }

  function elapsed_ms(started_at) {
    return Math.round(performance.now() - started_at);
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

    const started_at = performance.now();
    chrome.runtime.sendMessage({ action: "get_login_data" }, (resp) => {
      if (!resp || resp.error) {
        log(`获取账号密码失败: ${resp && resp.error}`);
        return;
      }
      fillAndDispatch(username, resp.username);
      fillAndDispatch(password, resp.password);
      const login_data_ms = elapsed_ms(started_at);
      log(`自动填写账号密码（本机助手 ${login_data_ms} ms）`);
      const btn = findSubmitButton();
      if (btn) btn.click();
    });
    return true;
  }

  function handleTokenSelectPage() {
    const select = document.querySelector("select");
    if (!select) return false;
    chrome.runtime.sendMessage({ action: "get_token_label" }, (resp) => {
      if (!resp || resp.error) {
        log(`获取 Token 名称失败: ${resp && resp.error}`);
        return;
      }
      const configured_token_label = (resp.token_label || "Selfload").trim().toLowerCase();
      const is_totp_token = (label) => label.includes(" - totp - ");
      const target = Array.from(select.options).find((option) => {
        const option_label = option.textContent.trim().toLowerCase();
        return is_totp_token(option_label) && option_label.includes(configured_token_label);
      });
      if (!target) {
        log(`未找到已配置的 Token: ${resp.token_label || "Selfload"}`);
        return;
      }

      select.value = target.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      log(`自动选择令牌: ${target.textContent.trim()}`);
      const btn = findSubmitButton();
      if (btn) btn.click();
    });
    return true;
  }

  function handleOtpPage() {
    const otpField = document.querySelector(
      '#otc, input[name="j_tokenNumber"], input[name="otp"], input[autocomplete="one-time-code"]'
    );
    if (!otpField || otpField.value) return false;

    const started_at = performance.now();
    chrome.runtime.sendMessage({ action: "get_totp" }, (resp) => {
      if (!resp || resp.error) {
        log(`获取验证码失败: ${resp && resp.error}`);
        return;
      }
      fillAndDispatch(otpField, resp.code);
      const totp_ms = elapsed_ms(started_at);
      log(`自动填写 TOTP 验证码（本机助手 ${totp_ms} ms）`);
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
    chrome.runtime.sendMessage({ action: "warm_native_helper" });
    clickSSOLink();
  }

  run();
})();
