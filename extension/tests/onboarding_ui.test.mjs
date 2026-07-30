import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("onboarding presents a compact setup tool layout", async () => {
  const html = await readFile(new URL("../onboarding.html", import.meta.url), "utf8");

  assert.match(html, /class="setup_shell"/);
  assert.match(html, /class="progress_panel"/);
  assert.match(html, /class="qr_upload"/);
  assert.match(html, /for="token_qr"/);
  assert.doesNotMatch(html, /id="clear"/);
});

test("onboarding gives one plain-language IDM setup guide instead of a numbered wizard", async () => {
  const html = await readFile(new URL("../onboarding.html", import.meta.url), "utf8");

  assert.match(html, /class="setup_guide"/);
  assert.match(html, /idm\.rwth-aachen\.de\/selfservice\/MFATokenManager\?2/);
  assert.doesNotMatch(html, /<ol class="steps">/);
});

test("onboarding keeps the reinstall command available after detecting a native helper", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../onboarding.html", import.meta.url), "utf8"),
    readFile(new URL("../onboarding.js", import.meta.url), "utf8"),
  ]);

  assert.match(source, /setInterval\(check_helper_status,/);
  assert.doesNotMatch(source, /helper_setup\.hidden = true/);
  assert.match(source, /helper_setup\.classList\.add\("installed"\)/);
  assert.match(html, /id="copy_install_command"/);
  assert.match(source, /已检测到本机助手/);
});

test("onboarding stores a user-configured Token label for exact selection", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../onboarding.html", import.meta.url), "utf8"),
    readFile(new URL("../onboarding.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="token_label"/);
  assert.match(source, /token_label:/);
});

test("onboarding delegates QR import and verification-code preview to the native helper", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../onboarding.html", import.meta.url), "utf8"),
    readFile(new URL("../onboarding.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="verification_code"/);
  assert.match(source, /action: "import_token_qr"/);
  assert.match(source, /action: "get_imported_totp"/);
  assert.match(source, /use_imported_token: true/);
  assert.doesNotMatch(source, /BarcodeDetector/);
  assert.doesNotMatch(source, /totp_secret:/);
  assert.match(source, /token_qr_input\.addEventListener\("change"/);
});
