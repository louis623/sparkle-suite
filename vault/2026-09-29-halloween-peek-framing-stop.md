# 2026-09-29 Halloween peek framing stop

- Louis rejected the PR #46 crops. Not merged. Not deployed. No new encode.
- Witch recording `1280×800` includes the site header, bars, title, and CTAs after the browser chrome, but the pumpkin stays bright through the last page row (`y=742`). The art is cut by the capture viewport. Removing only the chrome cannot restore it.
- Cat recording `1024×640` includes the sample bar, header, and lineup, and does not contain the left headline. The good still’s headline box has about 12,400 orange text pixels; the same region in the recording has about 0. The pumpkin also runs off the bottom.
- Stopped instead of shipping another partial peek. A new capture has to show header, bars, all copy, all CTAs, pause, and the full pumpkin, cat, moon, and witch with margin inside the frame.
