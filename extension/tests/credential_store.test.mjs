import assert from "node:assert/strict";
import test from "node:test";

const storage = {};
globalThis.chrome = {
  storage: {
    local: {
      async get(key) {
        return { [key]: storage[key] };
      },
      async set(values) {
        Object.assign(storage, values);
      },
      async remove(key) {
        delete storage[key];
      },
    },
  },
};

const {
  clear_configuration,
  get_configuration,
  has_configuration,
  save_configuration,
} = await import("../credential_store.mjs");

test("saves a complete local user configuration without using sync storage", async () => {
  await clear_configuration();
  await save_configuration({
    username: "ab123456",
    password: "correct horse battery staple",
    totp_secret: "JBSWY3DPEHPK3PXP",
    totp_algorithm: "SHA-1",
    totp_digits: 6,
    totp_period: 30,
  });

  assert.equal(await has_configuration(), true);
  assert.deepEqual(await get_configuration(), {
    username: "ab123456",
    password: "correct horse battery staple",
    totp_secret: "JBSWY3DPEHPK3PXP",
    totp_algorithm: "SHA-1",
    totp_digits: 6,
    totp_period: 30,
  });
});

test("clearing local configuration stops automatic login", async () => {
  await clear_configuration();

  assert.equal(await has_configuration(), false);
  assert.equal(await get_configuration(), null);
});
