# Privacy Policy — RWTHonline Auto Login

Last updated: 26 July 2026

RWTHonline Auto Login is a browser extension that assists a user with logging in to RWTH websites.

## Data processed locally

The extension processes the following data only on the user's device:

- the RWTH username and password entered by the user;
- the TOTP secret decoded from the Token QR-code image selected by the user;
- a locally generated current TOTP code; and
- a small local activity log containing the extension's login actions and the RWTH host name.

The QR-code image is decoded locally. The extension does not upload the image, credentials, TOTP secret, generated code, activity log, or browsing data to the developer or to any third party.

The extension only operates on RWTH Aachen domains needed for its described sign-in function. It does not run on non-RWTH domains.

## Storage and control

The activity log is stored in `chrome.storage.local` for the current Chrome profile and is not stored in Chrome Sync. The username, password, and TOTP secret are stored by the separately installed local helper in the operating system credential vault: macOS Keychain or Windows Credential Manager. The extension receives them only when it needs to complete an RWTH sign-in or generate the current TOTP code.

Users can replace the saved credentials and TOTP secret by running the extension's configuration flow again. Removing the extension removes the extension's local activity log; operating-system credential-vault entries remain under the user's control and can be removed through the credential manager.

The credentials and TOTP secret are retained locally until the user replaces or removes them through the operating system's credential manager. The extension does not maintain a remote account, server-side database, analytics service, or backup of this data.

## Security and use limitation

Authentication information is used solely to provide the user-facing RWTH sign-in automation described by this extension. It is not sold, shared, used for advertising, or made available for human review by the developer. The extension communicates with the local helper only through Chrome's native-messaging channel and communicates with RWTH pages only over HTTPS.

## Permissions

The extension uses `storage` to retain its local activity log, `nativeMessaging` solely to communicate with the local helper, and access to RWTH Aachen domains solely to identify RWTH sign-in pages and fill the user's saved credentials after the user has configured the extension. It does not run on non-RWTH domains.

## Contact

For support or privacy questions, contact leonhartyu2005@gmail.com.
