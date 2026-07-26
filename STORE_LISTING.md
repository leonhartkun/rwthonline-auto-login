# Chrome Web Store Listing Draft

## Name

RWTHonline Auto Login

## Short description

Locally completes RWTH sign-in using your own credentials and TOTP Token.

## Description text for the Chrome Web Store

RWTHonline Auto Login helps you complete supported RWTH Aachen sign-in steps without repeatedly entering your username, password, and Token code.

During one-time setup, enter your own RWTH username and password and select your own Token QR-code image from this device. The QR code is decoded locally. A separately installed, open-source helper stores the credentials in macOS Keychain or Windows Credential Manager and generates the required TOTP code locally when needed.

Your QR image, credentials, TOTP secret, generated codes, and activity log are not sent to the developer or any third party. The extension only operates on RWTH Aachen domains needed for sign-in. It does not run on other websites.

You can update your configuration any time from the extension menu. This is an independent project and is not affiliated with or endorsed by RWTH Aachen University.

## Detailed description

RWTHonline Auto Login helps you sign in to supported RWTH Aachen websites without repeatedly typing your credentials and TOTP code.

During one-time setup, enter your own RWTH username and password, then choose your own Token QR-code image from your device. The extension reads the QR code only locally. A separately installed, open-source local helper stores the credentials in macOS Keychain or Windows Credential Manager and generates the required TOTP code locally when needed.

Your QR image, credentials, TOTP secret, generated codes, and activity log are not sent to the developer or any third party. You can update your local configuration at any time from the extension settings page.

This is an independent project and is not affiliated with or endorsed by RWTH Aachen University.

Before saving credentials, the setup page shows the local-storage notice and requires the user to acknowledge the Privacy Policy and User Notice.

## Store URLs

- Homepage URL: https://github.com/leonhartkun/rwthonline-auto-login
- Support URL: https://github.com/leonhartkun/rwthonline-auto-login/issues
- Privacy policy URL: https://github.com/leonhartkun/rwthonline-auto-login/blob/main/PRIVACY.md
- User notice URL: https://github.com/leonhartkun/rwthonline-auto-login/blob/main/USER_NOTICE.md
- Usage instructions URL: https://github.com/leonhartkun/rwthonline-auto-login/blob/main/USAGE.md
- Permission details URL: https://github.com/leonhartkun/rwthonline-auto-login/blob/main/PERMISSIONS.md

## Single purpose description

RWTHonline Auto Login uses user-configured credentials and TOTP information stored in the local operating-system credential vault to complete the required steps on supported RWTH Aachen sign-in pages.

## Permission justification text

### Native Messaging

Used only to communicate with the user-installed local helper. The helper stores the RWTH username, password, and TOTP secret in macOS Keychain or Windows Credential Manager and returns only the credentials or current TOTP code needed for a supported RWTH sign-in. It does not access arbitrary files or upload data.

### Storage

Used only for up to 50 local, user-visible activity-log entries containing time, automation action, and RWTH host name. Credentials and TOTP secrets are not stored in Chrome Storage.

### Tabs

Used only to close the extension's own onboarding tab after configuration succeeds. It is not used to read browsing history, enumerate tabs, or access other tab content.

### Host permission: `https://*.rwth-aachen.de/*`

Used only to run the sign-in automation on RWTH Aachen domains: identify SSO entry points on RWTH pages and fill the configured credentials, Token selection, and current TOTP code on `sso.rwth-aachen.de`. The extension does not run on any other website.

## Promotional assets

- Small promotional tile: `store_assets/small_promo_440x280.png`
- Large promotional tile: `store_assets/large_promo_1400x560.png`

## Privacy disclosure answers

- User data handled: authentication information (username, password, TOTP secret) and website activity limited to RWTH host names used by the extension.
- Data sold: no.
- Data transferred to third parties: no.
- Data used outside the extension's core function: no.
- Privacy policy: see the Store URLs section above.
- User notice: see the Store URLs section above.

## Submission checklist

1. Register the Chrome Web Store publisher account and complete payment or verification prompts in the Developer Dashboard.
2. Upload `store_assets/onboarding_setup_1280x800.png` as the setup-page screenshot. Do not upload screenshots that show a real username, password, QR code, or TOTP code.
3. Upload `dist/rwthonline_auto_login.zip`.
4. Enter the Homepage URL and Support URL from the Store URLs section.
5. Complete the Privacy tab using the answers above, choose public or unlisted distribution, provide the support email, and submit for review.
