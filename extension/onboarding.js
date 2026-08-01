const form = document.getElementById("onboarding_form");
const username_input = document.getElementById("username");
const password_input = document.getElementById("password");
const token_label_input = document.getElementById("token_label");
const token_qr_input = document.getElementById("token_qr");
const token_preview = document.getElementById("token_preview");
const verification_code = document.getElementById("verification_code");
const verification_countdown = document.getElementById("verification_countdown");
const status_element = document.getElementById("status");
const helper_setup = document.getElementById("helper_setup");
const helper_title = document.getElementById("helper_title");
const copy_install_command = document.getElementById("copy_install_command");
const release_tag = `v${chrome.runtime.getManifest().version}`;
const release_base_url = `https://github.com/leonhartkun/rwthonline-auto-login/releases/download/${release_tag}`;
const repository_url = "https://github.com/leonhartkun/rwthonline-auto-login";
let helper_installed = false;
let imported_token_ready = false;
let imported_token_period = 30;

function set_status(message, type = "") {
  status_element.textContent = message;
  status_element.className = type;
}

function setup_install_command() {
  const extension_id = chrome.runtime.id;
  const is_windows = navigator.platform.toLowerCase().includes("win");
  const command = is_windows
    ? `$env:RWTH_RELEASE_TAG='${release_tag}'; irm ${release_base_url}/install_windows.ps1 | iex; Install-RwthonlineHelper -ExtensionId ${extension_id}`
    : `curl -fsSL ${release_base_url}/install_macos.sh | RWTH_RELEASE_TAG=${release_tag} sh -s -- ${extension_id}`;
  document.getElementById("install_command").textContent = command;
  document.getElementById("source_link").href = repository_url;
  copy_install_command.addEventListener("click", async () => {
    await navigator.clipboard.writeText(command);
    set_status("安装命令已复制。安装完成后，本页会自动继续。", "success");
  });
}

async function refresh_verification_code() {
  if (!imported_token_ready) return;
  const response = await send_background({ action: "get_imported_totp" });
  if (!response?.ok) {
    imported_token_ready = false;
    token_preview.hidden = true;
    throw new Error(response?.error || "无法读取当前验证码。");
  }
  imported_token_period = response.period || imported_token_period;
  verification_code.textContent = response.code;
  const seconds_remaining = imported_token_period - (Math.floor(Date.now() / 1_000) % imported_token_period);
  verification_countdown.textContent = `${seconds_remaining} 秒后更新`;
}

token_qr_input.addEventListener("change", async () => {
  token_preview.hidden = true;
  imported_token_ready = false;
  const selected_file = token_qr_input.files[0];
  if (!selected_file) return;

  try {
    const image_base64 = await file_to_base64(selected_file);
    const response = await send_background({ action: "import_token_qr", image_base64 });
    if (!response?.ok) {
      throw new Error(response?.error || "未能读取 Token 二维码。请使用清晰的二维码截图。");
    }
    imported_token_ready = true;
    imported_token_period = response.period || 30;
    verification_code.textContent = response.code;
    const seconds_remaining = imported_token_period - (Math.floor(Date.now() / 1_000) % imported_token_period);
    verification_countdown.textContent = `${seconds_remaining} 秒后更新`;
    token_preview.hidden = false;
  } catch (error) {
    set_status(error.message, "error");
  }
});

function send_background(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function file_to_base64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", () => reject(new Error("无法读取所选二维码图片。")));
    reader.addEventListener("load", () => resolve(String(reader.result).split(",", 2)[1]));
    reader.readAsDataURL(file);
  });
}

async function check_helper_status() {
  const status = await send_background({ action: "get_helper_status" });
  if (!status?.ok) {
    return;
  }
  if (!helper_installed) {
    helper_installed = true;
    helper_setup.classList.add("installed");
    helper_title.textContent = "本机助手已就绪";
    copy_install_command.textContent = "复制重新安装命令";
    set_status("已检测到本机助手。填写账号、密码并选择 Token 二维码后即可保存。", "success");
  }
  window.clearInterval(helper_status_timer);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  set_status("正在本地读取二维码…");

  try {
    const selected_file = token_qr_input.files[0];
    if (!helper_installed) {
      throw new Error("请先完成本机助手安装。");
    }
    if (!selected_file || !password_input.value || !imported_token_ready) {
      throw new Error("请填写密码，并先选择可读取的 Token 二维码图片。");
    }
    const response = await send_background({
      action: "configure_credentials",
      username: username_input.value,
      password: password_input.value,
      token_label: token_label_input.value.trim(),
      use_imported_token: true,
    });
    if (!response?.ok) {
      throw new Error(response?.error || "无法保存到系统保险库。");
    }
    await chrome.storage.local.set({ token_label: token_label_input.value.trim() });
    password_input.value = "";
    token_qr_input.value = "";
    imported_token_ready = false;
    set_status("已保存。正在关闭设置页…", "success");
    setTimeout(() => send_background({ action: "close_onboarding" }), 600);
  } catch (error) {
    set_status(error.message, "error");
  }
});

setup_install_command();
check_helper_status().catch(() => {});
const helper_status_timer = window.setInterval(check_helper_status, 1500);
window.setInterval(() => refresh_verification_code().catch(() => {}), 1000);
