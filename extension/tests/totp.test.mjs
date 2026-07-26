import assert from "node:assert/strict";
import test from "node:test";

import { generate_totp, parse_otpauth_uri } from "../totp.mjs";

test("generates the RFC 6238 SHA-1 test vector", async () => {
  const code = await generate_totp(
    "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
    59_000,
    { digits: 8, period: 30, algorithm: "SHA-1" }
  );

  assert.equal(code, "94287082");
});

test("parses a standard otpauth TOTP URI", () => {
  assert.deepEqual(
    parse_otpauth_uri(
      "otpauth://totp/RWTH?secret=JBSWY3DPEHPK3PXP&issuer=RWTH"
    ),
    {
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA-1",
      digits: 6,
      period: 30,
    }
  );
});

test("rejects an otpauth URI without a secret", () => {
  assert.throws(
    () => parse_otpauth_uri("otpauth://totp/RWTH?issuer=RWTH"),
    /secret/i
  );
});
