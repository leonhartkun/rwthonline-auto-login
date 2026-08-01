import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("background keeps a native messaging port instead of one-shot helper calls", async () => {
  const background = await readFile(new URL("../background.js", import.meta.url), "utf8");

  assert.match(background, /chrome\.runtime\.connectNative/);
  assert.doesNotMatch(background, /chrome\.runtime\.sendNativeMessage/);
  assert.match(background, /pending_native_requests/);
  assert.match(background, /chrome\.runtime\.onStartup/);
  assert.match(background, /action: "get_login_data"/);
});

test("login page receives all vault data through one native request", async () => {
  const contentScript = await readFile(new URL("../content_script.js", import.meta.url), "utf8");

  assert.match(contentScript, /action: "get_login_data"/);
  assert.doesNotMatch(contentScript, /action: "get_credentials"/);
});

test("token selection uses the configured Token label before the Selfload fallback", async () => {
  const [background, contentScript] = await Promise.all([
    readFile(new URL("../background.js", import.meta.url), "utf8"),
    readFile(new URL("../content_script.js", import.meta.url), "utf8"),
  ]);

  assert.match(background, /action === "get_token_label"/);
  assert.match(background, /chrome\.storage\.local\.get\("token_label"\)/);
  const tokenSelection = contentScript.match(
    /function handleTokenSelectPage\(\) \{([\s\S]*?)\n  \}\n\n  function handleOtpPage/
  )?.[1] || "";
  assert.match(tokenSelection, /action: "get_token_label"/);
  assert.doesNotMatch(tokenSelection, /get_login_data/);
  assert.match(tokenSelection, /configured_token_label/);
  assert.match(tokenSelection, /is_totp_token/);
  assert.match(tokenSelection, /includes\(configured_token_label\)/);
});

test("keeps the Token label in extension storage so an existing helper can use it", async () => {
  const [background, onboarding] = await Promise.all([
    readFile(new URL("../background.js", import.meta.url), "utf8"),
    readFile(new URL("../onboarding.js", import.meta.url), "utf8"),
  ]);

  assert.match(background, /get\("token_label"\)/);
  assert.match(onboarding, /set\(\{ token_label:/);
});

test("records non-secret durations for each native helper request", async () => {
  const background = await readFile(new URL("../background.js", import.meta.url), "utf8");
  const contentScript = await readFile(new URL("../content_script.js", import.meta.url), "utf8");

  assert.match(background, /native_timing/);
  assert.match(background, /elapsed_ms/);
  assert.match(contentScript, /login_data_ms/);
  assert.match(contentScript, /totp_ms/);
});

test("Windows release uses a self-contained native helper executable", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/release-helper.yml", import.meta.url),
    "utf8"
  );

  assert.match(workflow, /runner\.os == 'Windows'/);
  assert.match(workflow, /pyinstaller --onefile --name rwthonline_native_host/);
});

test("Windows installer fails closed and writes Chrome's native-host default value", async () => {
  const installer = await readFile(
    new URL("../../installers/install_windows.ps1", import.meta.url),
    "utf8"
  );

  assert.match(installer, /\$ErrorActionPreference\s*=\s*'Stop'/);
  assert.match(installer, /curl\.exe/);
  assert.match(installer, /safeReleaseTag/);
  assert.match(installer, /Test-Path \$helperPath/);
  assert.match(installer, /reg\.exe add .*\/ve .*\/d \$manifestPath .*\/f/);
});
