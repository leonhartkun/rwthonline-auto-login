# Chrome Web Store Listing Draft

## Name

RWTHonline Auto Login

## Short description

Locally completes RWTH sign-in using your own credentials and TOTP Token.

## Detailed description

RWTHonline Auto Login helps you sign in to supported RWTH Aachen websites without repeatedly typing your credentials and TOTP code.

During one-time setup, enter your own RWTH username and password, then choose your own Token QR-code image from your device. The extension reads the QR code only locally. A separately installed, open-source local helper stores the credentials in macOS Keychain or Windows Credential Manager and generates the required TOTP code locally when needed.

Your QR image, credentials, TOTP secret, generated codes, and activity log are not sent to the developer or any third party. You can update your local configuration at any time from the extension settings page.

This is an independent project and is not affiliated with or endorsed by RWTH Aachen University.

Before saving credentials, the setup page shows the local-storage notice and requires the user to acknowledge the Privacy Policy and User Notice.

## Privacy disclosure answers

- User data handled: authentication information (username, password, TOTP secret) and website activity limited to RWTH host names used by the extension.
- Data sold: no.
- Data transferred to third parties: no.
- Data used outside the extension's core function: no.
- Privacy policy: https://github.com/leonhartkun/rwthonline-auto-login/blob/main/PRIVACY.md
- User notice: https://github.com/leonhartkun/rwthonline-auto-login/blob/main/USER_NOTICE.md

## Submission checklist

1. Register the Chrome Web Store publisher account and complete payment or verification prompts in the Developer Dashboard.
2. Capture at least one clear screenshot of the setup page and one of the extension on a RWTH sign-in page, without any real usernames, passwords, QR codes, or TOTP codes visible.
3. Upload `dist/rwthonline_auto_login.zip`.
4. Complete the Privacy tab using the answers above, choose public or unlisted distribution, provide the support email, and submit for review.
