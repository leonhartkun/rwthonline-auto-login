# Helper-owned QR import and code preview

## Goal

Remove the Chrome `BarcodeDetector` dependency from onboarding. A user selects a local Token QR image; the native helper decodes it locally, retains the parsed TOTP configuration in its process memory, and returns only the current code and display metadata to the extension.

## Data flow

1. The onboarding page reads the selected local image as base64 and sends it over Chrome Native Messaging with `import_token_qr`.
2. The helper decodes the image using the bundled `zxing-cpp` Python binding, parses the `otpauth://totp/...` URI, and stores the TOTP configuration only in its in-memory pending-import slot.
3. The helper returns the current TOTP code, period/countdown metadata, and a non-secret display label. It never returns the TOTP secret to the extension.
4. On save, onboarding sends username, password, and the selected Token label with `use_imported_token: true`. The helper persists the pending configuration to the OS credential vault together with the credentials.
5. Preview refreshes ask the helper for a code from the pending import. If the helper was restarted, onboarding tells the user to reselect the local QR image.

## Failure handling

- Missing or unsupported QR content returns a clear helper error; no credentials are stored.
- An unsupported helper or missing native connection leaves the install/reinstall command visible.
- Save is rejected unless a QR import exists for the current helper session.

## Packaging and test plan

- Add `zxing-cpp` to native helper build dependencies and bundle it in macOS and Windows helpers.
- Unit-test valid import, malformed image/URI rejection, preview generation, and persistence without exposing the secret.
- Extension tests verify no `BarcodeDetector` dependency and use of helper import/preview messages.
- Build and test a Windows helper via CI before creating a new public release or Chrome Web Store upload.
