import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("onboarding requires a clear local-data acknowledgement", async () => {
  const html = await readFile(new URL("../onboarding.html", import.meta.url), "utf8");

  assert.match(html, /id="privacy_acknowledgement"/);
  assert.match(html, /id="privacy_link"/);
  assert.match(html, /id="user_notice_link"/);
  assert.match(html, /type="checkbox"/);
});

test("public documents disclose local credential-vault handling", async () => {
  const [privacy_policy, user_notice] = await Promise.all([
    readFile(new URL("../../PRIVACY.md", import.meta.url), "utf8"),
    readFile(new URL("../../USER_NOTICE.md", import.meta.url), "utf8"),
  ]);

  assert.match(privacy_policy, /macOS Keychain|Windows Credential Manager/);
  assert.match(privacy_policy, /not run on non-RWTH domains/i);
  assert.match(user_notice, /not affiliated with or endorsed by RWTH Aachen University/i);
});
