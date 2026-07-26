# Onboarding Tool Page Design

## Goal

Replace the generic, card-heavy first-run screen with a compact setup tool that makes the credential fields and local QR-code import easy to understand.

## Layout

The page uses a restrained application shell with a short header, a left-side progress/status panel, and a right-side setup form on wide screens. Narrow screens stack the panels. The local helper is explained as a concrete dependency rather than a marketing section.

## Interaction

The existing native-helper detection, installation-command copy, local QR decoding, validation, save, error, and close-on-success behavior remains unchanged. The QR file field becomes a clearly bounded drop-style upload zone while retaining the native file chooser for accessibility.

## Visual rules

Use neutral surfaces, modest borders, dense spacing, a single blue primary action, and a small yellow status accent. Avoid gradients, oversized rounded cards, generic reassurance copy, and decorative shadows.
