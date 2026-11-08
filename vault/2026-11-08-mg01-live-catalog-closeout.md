# MG01 private catalog release

The Smoke-approved application commit `58acf959e1025cc7e3c1de30bad7ff4d1c8830cd` shipped to the Sparkle Suite production project as `dpl_5ke3MnPCMsErracXNb3Vh5N5R4au`. Both Suite aliases and the owner's apex and www aliases resolve to it. Rocky's independent release review passed. Previous application deployment: `dpl_9ooWtHG7evcyQD2Bd6sFiAYuhG5w` (`ac1be76b`).

Applied only the verified MG01 catalog migration after the app became ready. Readback proved private owner access via the picker RPC, active internal demo eligibility, zero other regular reps with access, and zero active selections. Verified the owner's original appearance before and after, including both public routes. No account settings were written. The private preview rejected anonymous access. The picker was checked at its data source, without using a personal login.

On Smoke the simulated slow phone showed the hero in 1.72 s. The first desktop request took 3.54 s (2.86 s waiting for the response); three new desktop sessions measured 0.68–0.75 s. Rollback: withdraw this catalog entry before restoring the previous app; check for new selections first and coordinate with the owner if one exists.
