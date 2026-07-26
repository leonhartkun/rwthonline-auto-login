import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("store promotional SVGs declare the required canvas sizes", async () => {
  const [small, large] = await Promise.all([
    readFile(new URL("../../store_assets/small_promo_440x280.svg", import.meta.url), "utf8"),
    readFile(new URL("../../store_assets/large_promo_1400x560.svg", import.meta.url), "utf8"),
  ]);

  assert.match(small, /width="440" height="280"/);
  assert.match(large, /width="1400" height="560"/);
});
