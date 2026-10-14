# 2026-10-14 resources.emailPreview closeout

- Added LOC read `resources.emailPreview` with the same content fields as `resources.publish`. `title` is required. It renders `suite-official-notice` through `resourceNoticeContent` and `renderSuiteOfficialNoticeHtml`.
- The preview does not send. Suite list delivery stays on `resources.publish` when `emailSuiteList` is true, through `runExistingLocRoute` into `deliverSuiteListNotice`.
- Tests live in `tests/loc-resources-email-preview.test.ts`. Delivery is mocked. No email was sent.
- Not merged and not deployed.
