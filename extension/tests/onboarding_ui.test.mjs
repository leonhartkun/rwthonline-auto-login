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

test("onboarding automatically detects a newly installed native helper", async () => {
  const source = await readFile(new URL("../onboarding.js", import.meta.url), "utf8");

  assert.match(source, /setInterval\(check_helper_status,/);
  assert.match(source, /helper_setup\.hidden = true/);
  assert.match(source, /已检测到本机助手/);
});
