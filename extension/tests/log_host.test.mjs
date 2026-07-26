import assert from "node:assert/strict";
import test from "node:test";

import { rwth_host_from_url } from "../log_host.mjs";

test("stores only the RWTH host from a page URL", () => {
  assert.equal(
    rwth_host_from_url("https://sso.rwth-aachen.de/idp/profile/SAML2/Redirect/SSO?opaque=value"),
    "sso.rwth-aachen.de"
  );
});

test("rejects non-RWTH and malformed addresses for the activity log", () => {
  assert.equal(rwth_host_from_url("https://example.org/private"), "");
  assert.equal(rwth_host_from_url("not a URL"), "");
});
