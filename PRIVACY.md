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

## Storage and control

Configuration and the activity log are stored in `chrome.storage.local` for the current Chrome profile. They are not stored in Chrome Sync. Users can remove all saved credentials and TOTP configuration in the extension's settings page; removing the extension also removes its local extension storage.

## Permissions

The extension uses `storage` to retain its local configuration and activity log. It uses access to RWTH Aachen domains solely to identify login pages and fill the user's saved credentials after the user has configured the extension.

## Contact

Before publication, replace this section with a monitored support email address and the publisher's legal contact details where required by the Chrome Web Store.
