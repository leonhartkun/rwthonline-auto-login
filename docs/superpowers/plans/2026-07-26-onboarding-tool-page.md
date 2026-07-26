# Onboarding Tool Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a denser, human-designed-looking onboarding screen without changing credential setup behavior.

**Architecture:** Keep all JavaScript message flow unchanged. Replace only the onboarding page markup and CSS, then add a DOM-contract test that guards the visible setup structure.

**Tech Stack:** HTML, CSS, browser-native file input, Node test runner.

## Global Constraints

The setup flow stays local-only, preserves current element IDs used by `onboarding.js`, and remains usable on narrow screens.

---

### Task 1: Define the onboarding layout contract

**Files:**
- Create: `extension/tests/onboarding_ui.test.mjs`
- Modify: `extension/onboarding.html`

**Interfaces:**
- Consumes: `onboarding.js` element IDs: `helper_setup`, `install_command`, `copy_install_command`, `source_link`, `onboarding_form`, `username`, `password`, `token_qr`, `status`, `clear`.
- Produces: a semantic setup screen with progress panel and QR upload zone.

- [ ] **Step 1: Write the failing test**

```js
assert.match(html, /class="setup_shell"/);
assert.match(html, /class="progress_panel"/);
assert.match(html, /class="qr_upload"/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test extension/tests/onboarding_ui.test.mjs`

Expected: failure because the legacy page has none of the three structural classes.

- [ ] **Step 3: Implement the page structure and responsive CSS**

Keep all JavaScript-facing IDs unchanged. Add the three tested classes, associate the file input with an explicit label, and use a media query to stack the layout below 760px.

- [ ] **Step 4: Run the UI and existing TOTP tests**

Run: `node --test extension/tests/onboarding_ui.test.mjs extension/tests/totp.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Package and inspect**

Run: `./scripts/package_extension.sh && unzip -t dist/rwthonline_auto_login.zip`

Expected: the archive contains the revised onboarding page and passes the ZIP integrity check.
