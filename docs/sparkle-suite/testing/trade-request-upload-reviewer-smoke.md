# Trade request photo reviewer smoke

Use the approved `codex/nic-nac-trade-hardening` branch and the live customer domain `https://www.yoursparklesuite.com`. This flow creates only synthetic reviewer catalog entries and trade requests, then deletes them in `finally`. It does not use Louis's demo account, charge a card, contact a customer, or send a provider message. The two synthetic cards identify themselves as reviewer data.

## Automated request and cleanup

From the repo root with the normal Supabase environment in `.env.local`, set `SPARKLE_TRADE_UPLOAD_SMOKE_FILE` to a local JPEG, PNG, HEIC, HEIF, WebP, or AVIF sample no larger than 25 MiB. Set `SPARKLE_TRADE_UPLOAD_SMOKE_APP_URL=https://www.yoursparklesuite.com` and run:

```powershell
npx tsx --conditions=react-server scripts/smoke-trade-request-upload-flow.ts
```

The script resets only the designated synthetic reviewer persona, seeds two one-copy earrings, and checks a signed direct upload, private normalized attachment, idempotent submission, pending receipt, anonymous image denial, authenticated rep image access, a text-only request, and inventory reservation. Its `finally` block removes the requests, upload tickets and objects, listings, designs, and collection. A rerun reseeds clean data.

## Browser click-through

Set `SPARKLE_TRADE_UPLOAD_SMOKE_REVIEW_HOLD_MS=600000` before the same command. It prints a `reviewUrl` on the **www** domain and pauses for at most ten minutes before cleanup. Open that exact URL in an isolated signed-out browser. Do not use a guessed reviewer slug or Louis's personal account.

1. Confirm the page shows two `Synthetic Trade Upload Earrings` cards labeled as reviewer data. Open the `P` card and choose **Request this trade**.
2. Enter `Synthetic Reviewer Customer`, the displayed synthetic collection family, `Earrings`, and a short synthetic reveal description. Confirm the requested dancer and revealed details are shown side by side.
3. Select the sample photo. Confirm a preview, filename and size appear, followed by **Attached and ready to send with your request**. The image is optional; choosing **Remove photo** permits a text-only request.
4. Submit. Confirm **Request sent**, a private status link, and that the requested dancer leaves the available list. Open the status link and confirm **Your request is pending** without customer name, image, or internal notes.
5. Let the smoke command exit successfully so its cleanup runs. If the browser interaction exceeds ten minutes, rerun the command to reseed; the old request must not be treated as a product failure after the timer expires.

The same public page is available to ordinary visitors, but the synthetic cards exist only during the seeded window. There is no production reviewer-mode switch or token exposed to customers. Private screenshot access requires the owning rep's session; the receipt is a high-entropy bearer link and should stay private.
