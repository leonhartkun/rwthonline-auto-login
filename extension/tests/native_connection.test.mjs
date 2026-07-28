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
  const contentScript = await readFile(new URL("../content_script.js", import.meta.url), "utf8");

  assert.match(contentScript, /resp\.token_label/);
  assert.match(contentScript, /configured_token_label/);
});

test("records non-secret durations for each native helper request", async () => {
  const background = await readFile(new URL("../background.js", import.meta.url), "utf8");
  const contentScript = await readFile(new URL("../content_script.js", import.meta.url), "utf8");

  assert.match(background, /native_timing/);
  assert.match(background, /elapsed_ms/);
  assert.match(contentScript, /login_data_ms/);
  assert.match(contentScript, /totp_ms/);
});
