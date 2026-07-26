import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("extension icon uses the requested R mark and full page-fold corner", async () => {
  const icon = await readFile(new URL("../assets/icon.svg", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));

  assert.match(icon, /id="letter-r"/);
  assert.match(icon, /id="page-fold"/);
  assert.equal(manifest.icons["128"], "assets/icon_128.png");
});
