import { parse_otpauth_uri } from "./totp.mjs";

const form = document.getElementById("onboarding_form");
const username_input = document.getElementById("username");
const password_input = document.getElementById("password");
const token_qr_input = document.getElementById("token_qr");
const status_element = document.getElementById("status");
const release_base_url = "https://github.com/leonhartkun/rwthonline-auto-login/releases/latest/download";
const repository_url = "https://github.com/leonhartkun/rwthonline-auto-login";
let helper_installed = false;

function set_status(message, type = "") {
  status_element.textContent = message;
  status_element.className = type;
}

function setup_install_command() {
  const extension_id = chrome.runtime.id;
  const is_windows = navigator.platform.toLowerCase().includes("win");
  const command = is_windows
    ? `irm ${release_base_url}/install_windows.ps1 | iex; Install-RwthonlineHelper -ExtensionId ${extension_id}`
    : `curl -fsSL ${release_base_url}/install_macos.sh | sh -s -- ${extension_id}`;
  document.getElementById("install_command").textContent = command;
  document.getElementById("source_link").href = repository_url;
  document.getElementById("copy_install_command").addEventListener("click", async () => {
    await navigator.clipboard.writeText(command);
    set_status("安装命令已复制。执行后返回此页继续设置。", "success");
  });
}

async function decode_local_qr(file) {
  if (!("BarcodeDetector" in window)) {
    throw new Error("当前 Chrome 不支持本地二维码解析。请升级 Chrome 后重试。");
  }
  const supported_formats = await BarcodeDetector.getSupportedFormats();
  if (!supported_formats.includes("qr_code")) {
    throw new Error("当前 Chrome 不支持二维码解析。请升级 Chrome 后重试。");
  }

  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  const image = await createImageBitmap(file);
  try {
    const results = await detector.detect(image);
    if (results.length === 0) {
      throw new Error("未在图片中识别到二维码。请使用清晰的 Token 二维码截图。");
    }
    return results[0].rawValue;
  } finally {
    image.close();
  }
}

function send_background(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function load_existing_configuration() {
  const status = await send_background({ action: "get_helper_status" });
  helper_installed = Boolean(status?.ok);
  if (helper_installed) {
    set_status("本机助手已就绪。填写账号、密码并选择 Token 二维码后即可保存。", "success");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  set_status("正在本地读取二维码…");

  try {
    const selected_file = token_qr_input.files[0];
    if (!helper_installed) {
      throw new Error("请先完成本机助手安装。");
    }
    if (!selected_file || !password_input.value) {
      throw new Error("请填写密码并选择 Token 二维码图片。");
    }
    const totp_configuration = parse_otpauth_uri(await decode_local_qr(selected_file));
    const response = await send_background({
      action: "configure_credentials",
      username: username_input.value,
      password: password_input.value,
      totp_secret: totp_configuration.secret,
      totp_algorithm: totp_configuration.algorithm,
      totp_digits: totp_configuration.digits,
      totp_period: totp_configuration.period,
    });
    if (!response?.ok) {
      throw new Error(response?.error || "无法保存到系统保险库。");
    }
    password_input.value = "";
    token_qr_input.value = "";
    set_status("已保存到系统保险库。现在访问 RWTH 网站即可自动登录。", "success");
  } catch (error) {
    set_status(error.message, "error");
  }
});

document.getElementById("clear").addEventListener("click", () => {
  set_status("删除系统保险库数据将在下一版本的本机助手中提供。", "error");
});

setup_install_command();
load_existing_configuration().catch((error) => set_status(error.message, "error"));
