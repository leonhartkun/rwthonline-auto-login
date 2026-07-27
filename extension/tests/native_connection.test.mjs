import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("background keeps a native messaging port instead of one-shot helper calls", async () => {
  const background = await readFile(new URL("../background.js", import.meta.url), "utf8");

  assert.match(background, /chrome\.runtime\.connectNative/);
  assert.doesNotMatch(background, /chrome\.runtime\.sendNativeMessage/);
  assert.match(background, /pending_native_requests/);
});
