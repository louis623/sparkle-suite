# September 27, 2026 - Email magic-link sign-in

- Draft PR https://github.com/louis623/sparkle-suite/pull/38 on `cursor/magic-link-sign-in-aaf5`. No deploy, no password-policy change, no Chrome Web Store change.
- Sparkle Suite `/login` can email a magic link. The link returns through the same `/api/auth/callback` path Google already uses. Password and Google stay on the page.
- Sparkle Finder `/auth/sign-in` can email a magic link through the same `/auth/confirm` path signup already uses. Password, Google, and forgot password stay.
- Open the Suite link in the same browser that requested it. Finder links follow the existing confirm-email setup and can be opened from the inbox as usual.
- Focused Suite login tests and Finder auth/route tests passed. Live domains were not released.
