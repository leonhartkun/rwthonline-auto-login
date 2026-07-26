# Local User Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert RWTHonline Auto Login into a Chrome Web Store-ready extension that lets each user configure local credentials and a local TOTP QR image.

**Architecture:** A settings page imports and validates a local `otpauth` QR image, then persists the user's configuration in `chrome.storage.local`. The service worker reads the same configuration and produces TOTP codes; no native messaging host is shipped or required.

**Tech Stack:** Manifest V3, vanilla JavaScript, Web Crypto API, bundled QR decoder, Chrome Storage API.

## Global Constraints

- No credential, TOTP secret, QR image, log, or analytics data may leave the browser.
- Use `chrome.storage.local`, never `chrome.storage.sync`.
- Keep all project-controlled identifiers in `snake_case` where browser APIs do not prescribe names.
- The production ZIP contains only extension assets and excludes `extension_key.pem`, `native_host`, and logs.

---

### Task 1: Local configuration and TOTP modules

**Files:**
- Create: `extension/credential_store.js`
- Create: `extension/totp.js`
- Create: `extension/tests/totp.test.mjs`

**Interfaces:**
- Produces `get_configuration()`, `save_configuration(configuration)`, `clear_configuration()`, `has_configuration()`.
- Produces `parse_otpauth_uri(uri)` and `generate_totp(secret, timestamp_ms)`.

- [ ] **Step 1: Write failing TOTP and URI parsing tests**

```js
assert.equal(
  await generate_totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59000),
  '94287082'
);
assert.deepEqual(
  parse_otpauth_uri('otpauth://totp/RWTH?secret=JBSWY3DPEHPK3PXP&issuer=RWTH'),
  { secret: 'JBSWY3DPEHPK3PXP', algorithm: 'SHA-1', digits: 6, period: 30 }
);
```

- [ ] **Step 2: Run the test and verify it fails before the modules exist**

Run: `node --test extension/tests/totp.test.mjs`

- [ ] **Step 3: Implement Base32 decoding, URI validation, RFC 6238 HMAC generation, and local storage helpers**

```js
export async function generate_totp(secret, timestamp_ms = Date.now()) {
  const counter = Math.floor(timestamp_ms / 1000 / 30);
  // Decode Base32, import an HMAC key, truncate the digest, and pad to the URI digit count.
}
```

- [ ] **Step 4: Run the test and verify the RFC vector passes**

Run: `node --test extension/tests/totp.test.mjs`

### Task 2: First-run setup page with local QR import

**Files:**
- Create: `extension/onboarding.html`
- Create: `extension/onboarding.js`
- Create: `extension/vendor/qr_decoder.js`
- Modify: `extension/manifest.json`

**Interfaces:**
- Consumes `parse_otpauth_uri(uri)` and `save_configuration(configuration)`.
- Produces a saved `{ username, password, totp_secret, totp_algorithm, totp_digits, totp_period }` configuration.

- [ ] **Step 1: Write a DOM-level test or manual test script covering empty fields, invalid image, invalid URI, valid import, save, and clear**

```text
Choose a PNG containing an otpauth URI, fill account and password, click Save,
close and reopen the page, then verify the configured state appears without exposing the secret.
```

- [ ] **Step 2: Implement an accessible setup page**

```html
<input id="username" autocomplete="username" required>
<input id="password" type="password" autocomplete="current-password" required>
<input id="token_qr" type="file" accept="image/*" required>
<button id="save" type="submit">保存并启用自动登录</button>
```

- [ ] **Step 3: Bundle a QR decoder and decode only the selected local image**

```js
const selected_file = document.querySelector('#token_qr').files[0];
const otpauth_uri = await decode_qr_file(selected_file);
const totp_configuration = parse_otpauth_uri(otpauth_uri);
```

- [ ] **Step 4: Add clear-data confirmation and test the complete setup flow in Chrome**

### Task 3: Replace the native host backend and add safe runtime behavior

**Files:**
- Modify: `extension/background.js`
- Modify: `extension/content_script.js`
- Modify: `extension/popup.js`
- Modify: `extension/popup.html`

**Interfaces:**
- Consumes `get_configuration()` and `generate_totp()`.
- Produces responses to `get_credentials`, `get_totp`, and `open_onboarding` messages.

- [ ] **Step 1: Add a failing manual regression checklist for a clean profile and configured profile**

```text
Clean profile: a RWTH login page never receives blank credential submissions and the popup exposes Setup.
Configured profile: the extension reads local configuration and fills username, password, and a current valid code.
```

- [ ] **Step 2: Replace `chrome.runtime.sendNativeMessage` with local configuration lookup and TOTP generation**

```js
if (message.action === 'get_totp') {
  const configuration = await get_configuration();
  return { code: await generate_totp(configuration.totp_secret) };
}
```

- [ ] **Step 3: Add explicit setup navigation when configuration is missing and render log entries with DOM nodes rather than `innerHTML`**

```js
const entry = document.createElement('li');
entry.textContent = log_entry.text;
log_list.append(entry);
```

- [ ] **Step 4: Verify clean and configured flows in Chrome and inspect the extension service-worker console for errors**

### Task 4: Chrome Web Store packaging and disclosure

**Files:**
- Modify: `extension/manifest.json`
- Modify: `README.md`
- Create: `PRIVACY.md`
- Create: `STORE_LISTING.md`
- Create: `scripts/package_extension.sh`

**Interfaces:**
- Produces `dist/rwthonline_auto_login.zip`, ready for Chrome Web Store upload.

- [ ] **Step 1: Remove `nativeMessaging` and the fixed `key` from the manifest; add the setup page to `options_ui` and update version/copy**

```json
"options_ui": { "page": "onboarding.html", "open_in_tab": true }
```

- [ ] **Step 2: Write the public privacy policy and listing copy with accurate local-only disclosure**

```text
The extension processes credentials and TOTP setup information only on the user's device.
It does not transmit this information to the developer or any third party.
```

- [ ] **Step 3: Write a deterministic ZIP script that excludes private keys, logs, native-host files, and source-control metadata**

```sh
zip -r "$archive" . -x '*.pem' '*.log' 'tests/*' 'vendor/*.map'
```

- [ ] **Step 4: Build the ZIP, inspect its file list, validate `manifest.json`, and load the unpacked extension in Chrome**

- [ ] **Step 5: Capture required store screenshots and submit only after the publisher account is registered**
