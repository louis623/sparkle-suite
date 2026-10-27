# SSR pass 5 moved to normal Smoke — October 27, 2026

- Louis explicitly approved moving only sparkle-suite-smoke.vercel.app to the existing SSR pass-5 preview. No application changes or new deployments.
- Rollback recorded before alias mutation: **dpl_FD4TYQgPLe6UB8cE1zYgqyuJsV4Z**, source22ba7df60b651e756568bb3a75c0910fcf6a12c5, retained URL https://sparkle-suite-smoke-ixbgdploy-louis-2849s-projects.vercel.app.
- Vercel CLI alias set succeeded: https://sparkle-suite-smoke.vercel.app now points to **dpl_HqUE7kiDatd9EiYWWfpSxt1u4NTd**, source285d282ad5f40d6a1c7bb62445c2158936ac8762, existing URL https://sparkle-suite-smoke-34g65ne2x-louis-2849s-projects.vercel.app. Preview projectprj_VTY0rpz2O3VBJqJv69iBz8tzLexQ.
- Anonymous GET https://sparkle-suite-smoke.vercel.app/dudesfizzfest returned200, SSR marker present, x-sparkle-page-data:deferred. Served compiled homepage runtime returned200 and exactly matched pass5 Git bytes, SHA256 eae058dff46edc4a9909157ea95fb94a7d87247ef55205cd373688478dbdc098.
- https://yoursparklesuite.com returned200 after redirect towww. Apex/www metadata still resolve to protected **dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P**, source3f175871674e42dbc62d18419318941ea6a49935. No Live alias, env vars, settings or database/data changes; no forms or browser script execution.
- Existing pass5 delay/theme flags and known desktop-empty CLS failure remain unchanged; this is a Smoke review alias move, not Live approval. Git record is notes-only and git.deploymentEnabled remainsfalse. Stopped after verification.
