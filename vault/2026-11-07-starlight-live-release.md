# Starlight Christmas Hollow Live — November 7, 2026

- Louis approved all-rep Live release, accepted receipt-only PR184 head2a289ba7 after diff verification, and explicitly removed lineup/show-activity timing gates. Preflight production9f956acc, www deployment dpl_7RmE5Fatpo14C9q99Vx3NZkM679G, catalog0/assignments0 all matched.
- PR184 marked ready and merged as ac1be76bc9b6254b7873d88096c08d9d6c6af053. One Git-based production deployment dpl_9ooWtHG7evcyQD2Bd6sFiAYuhG5w READY, exact merge SHA. Both Suite www/apex aliases verified.
- Only 20261107000100_add_starlight_christmas_hollow.sql applied to Live after READY. Readback constraint includesStarlight; catalog exactly1Community row,ownerNULL,allow_internal_demo=false,assignedreps0. Workspace picker RPC reads this catalog.
- Bounded3/3acceptance: SparklyButterflies one200load/NeonButterfly retained; MileHighFizz one200load/unicorn retained/public discount enabled with MILEHIGHFIZZCUSTOMER and15%off; oneSQLcatalogcheck. No further tests/reruns, login, signup or rep-data changes. Discount post-signup interaction unexercised underread-onlyscope.
- Rollback retained dpl_7RmE5Fatpo14C9q99Vx3NZkM679G/9f956acc. No rollback needed. Report before removing catalog and restore any future assignedreps topreviousselections first iftheme removalneeded.
- Full report C:/workspace/codex-runs/starlight-live.report.md with JSON and screenshots. DeployedSHA remainsac1be76b; this commit is a receipt only and does not trigger another deployment.
