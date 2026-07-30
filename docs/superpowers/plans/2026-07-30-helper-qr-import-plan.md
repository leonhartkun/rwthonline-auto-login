# Helper-owned QR import and code preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decode Token QR images and generate onboarding preview codes in the native helper instead of relying on Chrome `BarcodeDetector`.

**Architecture:** The onboarding page transfers a selected local image to the helper through Native Messaging. The helper uses `zxing-cpp` to decode the QR, keeps parsed TOTP data only in a process-local pending import, and returns display metadata plus the current code. Saving credentials consumes that pending import and persists it in the OS vault.

**Tech Stack:** Manifest V3 JavaScript, Python 3, `zxing-cpp`, PyInstaller, Node test runner, Python unittest.

## Global Constraints

- QR images, TOTP secrets, credentials, and codes stay on the device and are never uploaded to a service.
- The extension must not depend on Chrome `BarcodeDetector`.
- The extension must never receive the parsed TOTP secret from the helper.
- macOS and Windows helper packages must bundle QR decoding dependencies.
- Chrome Web Store upload waits until Windows native-host protocol testing succeeds.

---

### Task 1: Define and test the helper QR-import boundary

**Files:**
- Modify: `native_host/tests/test_session_cache.py`
- Modify: `native_host/rwthonline_native_host.py`

**Interfaces:**
- Consumes: Native message `{action: "import_token_qr", image_base64: string}`.
- Produces: `{ok: true, token_label: string, code: string, period: int}` without `totp_secret`.
- Consumes: `{action: "get_imported_totp"}`.
- Produces: a fresh `{code: string, period: int}` from pending in-memory data.

- [ ] **Step 1: Write failing tests**

```python
def test_import_token_qr_keeps_secret_out_of_response(self):
    with patch.object(host, "decode_otpauth_from_image", return_value="otpauth://totp/RWTH:test?secret=JBSWY3DPEHPK3PXP"):
        response = host.handle({"action": "import_token_qr", "image_base64": "cG5n"})
    self.assertTrue(response["ok"])
    self.assertIn("code", response)
    self.assertNotIn("totp_secret", response)

def test_get_imported_totp_requires_an_import(self):
    self.assertIn("error", host.handle({"action": "get_imported_totp"}))
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `python -m unittest native_host/tests/test_session_cache.py`

Expected: FAIL because `import_token_qr` and `get_imported_totp` are unsupported.

- [ ] **Step 3: Implement the smallest helper boundary**

```python
PENDING_TOTP_IMPORT = None

def import_token_qr(message):
    global PENDING_TOTP_IMPORT
    PENDING_TOTP_IMPORT = parse_otpauth_uri(decode_otpauth_from_image(message["image_base64"]))
    return preview_import()

def preview_import():
    if not PENDING_TOTP_IMPORT:
        raise ValueError("Select the Token QR image again.")
    return {"ok": True, "token_label": PENDING_TOTP_IMPORT["label"],
            "code": current_totp_code(**PENDING_TOTP_IMPORT), "period": PENDING_TOTP_IMPORT["period"]}
```

- [ ] **Step 4: Run the helper tests to verify pass**

Run: `python -m unittest native_host/tests/test_session_cache.py`

Expected: PASS and import responses contain no TOTP secret.

- [ ] **Step 5: Commit**

```bash
git add native_host/rwthonline_native_host.py native_host/tests/test_session_cache.py
git commit -m "Add native QR import session"
```

### Task 2: Decode and validate local QR images in the helper

**Files:**
- Modify: `native_host/rwthonline_native_host.py`
- Modify: `.github/workflows/release-helper.yml`
- Test: `native_host/tests/test_session_cache.py`

**Interfaces:**
- Consumes: a base64 PNG/JPEG image from `import_token_qr`.
- Produces: the text of exactly one `otpauth://totp/` QR code.
- Raises: `ValueError("No TOTP QR code was found in the selected image.")` for malformed or non-TOTP content.

- [ ] **Step 1: Write failing decoder tests**

```python
def test_import_rejects_a_non_totp_uri(self):
    with patch.object(host, "decode_otpauth_from_image", return_value="https://example.invalid"):
        response = host.handle({"action": "import_token_qr", "image_base64": "cG5n"})
    self.assertIn("error", response)
```

- [ ] **Step 2: Run to verify failure**

Run: `python -m unittest native_host/tests/test_session_cache.py`

Expected: FAIL because URI validation is absent.

- [ ] **Step 3: Implement decoder and URI parser**

```python
import base64
import io
from urllib.parse import parse_qs, unquote, urlparse
import zxingcpp
from PIL import Image

def decode_otpauth_from_image(image_base64):
    image = Image.open(io.BytesIO(base64.b64decode(image_base64)))
    results = zxingcpp.read_barcodes(image)
    if not results:
        raise ValueError("No TOTP QR code was found in the selected image.")
    return results[0].text
```

Parse `secret`, `algorithm`, `digits`, `period`, and label; reject all non-`otpauth://totp/` URIs.

- [ ] **Step 4: Bundle runtime dependencies**

Add the following build command before PyInstaller in `.github/workflows/release-helper.yml`:

```yaml
- run: python -m pip install pyinstaller pillow zxing-cpp
```

Use PyInstaller hidden imports only if its analysis output shows a missed `zxingcpp` binary module.

- [ ] **Step 5: Run validation**

Run: `python -m unittest native_host/tests/test_session_cache.py`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add native_host/rwthonline_native_host.py native_host/tests/test_session_cache.py .github/workflows/release-helper.yml
git commit -m "Decode Token QR images in native helper"
```

### Task 3: Persist only the helper-owned pending import

**Files:**
- Modify: `native_host/rwthonline_native_host.py`
- Modify: `native_host/tests/test_session_cache.py`

**Interfaces:**
- Consumes: `{action: "configure_credentials", username, password, token_label, use_imported_token: true}`.
- Produces: `{ok: true}` after vault persistence.
- Rejects: configuration without a pending import when `use_imported_token` is true.

- [ ] **Step 1: Write failing persistence test**

```python
def test_configure_consumes_pending_import_without_receiving_secret(self):
    host.PENDING_TOTP_IMPORT = {"secret": "JBSWY3DPEHPK3PXP", "algorithm": "SHA-1", "digits": 6, "period": 30, "label": "RWTH:test"}
    with patch.object(host, "vault_write") as write:
        response = host.handle({"action": "configure_credentials", "username": "alice", "password": "secret", "token_label": "test", "use_imported_token": True})
    self.assertEqual(response, {"ok": True})
    self.assertTrue(any("JBSWY3DPEHPK3PXP" in str(call) for call in write.call_args_list))
```

- [ ] **Step 2: Run to verify failure**

Run: `python -m unittest native_host/tests/test_session_cache.py`

Expected: FAIL because configuration currently requires TOTP fields from the extension.

- [ ] **Step 3: Implement pending-import configuration**

When `use_imported_token` is true, merge username, password, and token label with the pending configuration inside `configure()`, write the combined vault record, and clear the pending import only after success.

- [ ] **Step 4: Run validation**

Run: `python -m unittest native_host/tests/test_session_cache.py`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add native_host/rwthonline_native_host.py native_host/tests/test_session_cache.py
git commit -m "Persist helper-owned Token import"
```

### Task 4: Replace browser QR handling in onboarding

**Files:**
- Modify: `extension/onboarding.js`
- Modify: `extension/tests/onboarding_ui.test.mjs`

**Interfaces:**
- Consumes: selected image file via `FileReader.readAsDataURL()`.
- Sends: `{action: "import_token_qr", image_base64}` and `{action: "get_imported_totp"}`.
- Sends configuration with `use_imported_token: true` and never sends `totp_secret`, `totp_algorithm`, `totp_digits`, or `totp_period`.

- [ ] **Step 1: Write failing extension tests**

```javascript
assert.doesNotMatch(source, /BarcodeDetector/);
assert.match(source, /action: "import_token_qr"/);
assert.match(source, /action: "get_imported_totp"/);
assert.match(source, /use_imported_token: true/);
assert.doesNotMatch(source, /totp_secret:/);
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test extension/tests/onboarding_ui.test.mjs`

Expected: FAIL because onboarding still uses `BarcodeDetector` and sends parsed TOTP fields.

- [ ] **Step 3: Implement onboarding calls**

Replace `decode_local_qr()` with `read_image_base64(file)`. On file selection call `import_token_qr`; show `response.code`, `response.period`, and `response.token_label`. On countdown refresh call `get_imported_totp`. On submit send `use_imported_token: true` only.

- [ ] **Step 4: Run extension tests**

Run: `node --test extension/tests/*.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extension/onboarding.js extension/tests/onboarding_ui.test.mjs
git commit -m "Use native helper for Token QR onboarding"
```

### Task 5: Build and perform Windows-native validation

**Files:**
- Modify: `extension/manifest.json`
- Modify: `dist/rwthonline_auto_login.zip`

**Interfaces:**
- Produces: a new test ZIP with a higher manifest version.
- Validates: native `import_token_qr` and `get_imported_totp` responses through the installed Windows helper protocol.

- [ ] **Step 1: Raise the extension test version**

Update `extension/manifest.json` from `1.2.1` to `1.2.2`.

- [ ] **Step 2: Run all unit checks**

Run: `node --test extension/tests/*.test.mjs && python -m unittest native_host/tests/test_session_cache.py`

Expected: all tests pass.

- [ ] **Step 3: Build the extension package**

Run: `./scripts/package_extension.sh`

Expected: `dist/rwthonline_auto_login.zip` contains `manifest.json` version `1.2.2` and no test files.

- [ ] **Step 4: Trigger Windows helper CI and verify released asset**

Run: `gh workflow run release-helper.yml --repo leonhartkun/rwthonline-auto-login -f release_tag=v1.2.2`

Expected: Windows job builds a onefile helper with `zxing-cpp` and uploads it to the designated release.

- [ ] **Step 5: Test Windows native protocol**

Use `ssh administrator@192.168.8.23` to install the helper and send an `import_token_qr` message framed as Chrome Native Messaging. Verify an OK preview response and then `get_imported_totp` response. Do not print the QR contents or code in logs.

- [ ] **Step 6: Commit**

```bash
git add extension/manifest.json dist/rwthonline_auto_login.zip
git commit -m "Prepare helper QR onboarding test build"
```

## Self-review

- Spec coverage: Tasks 1-3 cover helper-owned import, secret containment, and vault persistence; Task 4 removes Chrome QR support dependency; Task 2 covers bundled cross-platform decoding; Task 5 covers package and Windows native validation.
- Placeholder scan: no placeholders or deferred implementation steps remain.
- Interface consistency: `import_token_qr`, `get_imported_totp`, and `use_imported_token` are used consistently across helper, onboarding, and validation tasks.
