# 2026-10-18 public location comes from the roster

Draft PR #132 on `cursor/rep-join-unique-content`. Merged the latest `codex/nic-nac-trade-hardening` after PR #131 landed. No merge of #132 and no Live deploy.

Public city/state now comes only from the rep's join-team roster card. Littleton, Ohio, and Florida are no longer filled in when that card is blank. A blank card leaves location out of the title, H1, and description. Street segments and ZIP codes are stripped. The print-card shipping address is not used.

The customer-site layout lock stays on the production bytes. `preview-template-data.ts` and the other locked public files match `codex/nic-nac-trade-hardening`. Unique title, description, and canonical are applied after that mapper. Mile High Fizz and Britt with Bling keep their existing join heading and intro.
