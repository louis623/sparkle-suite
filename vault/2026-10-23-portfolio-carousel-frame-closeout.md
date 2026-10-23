## October 23, 2026 - Portfolio carousel frame fix

- Portfolio community slides stay on the full-site still. The live theme document was reflowing when its animation started, which washed the frame blue, stacked the hero, and showed a second pause control.
- Rep recordings fill one shared 1200/850 frame edge to edge. The Go for the Bling recording no longer has a baked-in pause pill beside the carousel control.
- Captions follow the centered slide. Both carousels advance on a 6.5s timer that does not wait for a recording to end.
- Not merged. Smoke re-alias stays with Suite. Production build typecheck passed. Local production `/portfolio` checks: stable 1178×834 frames, no iframe, no sample-account strings, one pause control, caption matched the visible slide, autoplay moved Pumpkin and Witch to Pumpkin and Cat.
