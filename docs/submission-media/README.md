# Submission media — sources

Everything here is **source, not output**. The rendered film and the slide
images are deliberately not committed: the video lives on YouTube, and both
artifacts regenerate from this directory plus a live deployment.

| Path                       | What it is                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `film/index.html`          | the HyperFrames composition for the 1:56 demo film (18 clips: 6 drawn cards + 12 live screen captures) |
| `film/tributary.srt`       | the 12 caption events, timed to the live shots only                                                    |
| `deck/deck.css`            | the shared sheet language every slide draws on                                                         |
| `deck/s01.html … s10.html` | the ten slides, one self-contained 1920×1080 document each                                             |

## The sheet language

Both artifacts are drawn as engineering sheets on paper, not as slides: double
rule border, Anton display, IBM Plex Mono for labels, Inter for prose, and a
fixed palette.

```
paper #f5efe2 · ink #22304a · ink2 #2c5f8a · ink3 #10233f
green #2f6b4f · red #c8402a · amber #9a6a1f · dim #6b7686
rule rgba(16,35,63,.32)
```

The film uses a darkened text variant for WCAG AA on paper at video
bitrates — `--amber:#8d611c`, `--dim:#5b6472`, `--redtxt:#ab3220`.

## Nothing on screen is invented

Every number in the film and the deck is read from the deployed registry, and
the deck states the read time. To re-derive them before a re-render:

```bash
curl -s https://tributary.persidian.com/registry/status | jq .stats
curl -s https://tributary.persidian.com/registry/replay | jq '.events | length'
curl -s https://tributary.persidian.com/registry/replay \
  | jq '[.events[].kind] | group_by(.) | map({kind: .[0], n: length})'
```

The counter semantics matter: `totalMerges` counts **attempts**, so
`171 attempts = 153 landed (merge rows) + 18 refused (conflict rows)`. The
dashboard currently labels that counter "merges landed"; the deck and film use
the reconciled wording instead.

## Rebuilding the film

1. **Capture the takes.** Drive `https://tributary.persidian.com` in a browser
   at 1920×1080 and record the twelve beats in
   `docs/VULTR_SUBMISSION.md` → "Demo beats for the video". Save them as
   `film/media/S04.mp4 … S14.mp4`, `S17.mp4`.
2. **Lay out the timeline.** Clip starts and durations are already written into
   the `data-start` / `data-duration` attributes of `film/index.html`; the six
   drawn cards (S01, S02, S03, S15, S16, S18) need no footage.
3. **Fonts.** Place the three families as woff2 under `film/fonts/woff2/`
   (`anton-400`, `mono-400/500/600`, `ui-400/500/600/700`) — the composition
   declares `@font-face` for `anton`, `mono`, `ui` and renders offline.
4. **Music bed.** `film/media/bed.mp3`, 115.835 s, `-17 LUFS`, fade-in 1.5 s,
   fade-out 5.5 s.
5. **Check, then render.**

```bash
cd film
npx hyperframes check
npx hyperframes snapshot --at 2,8.6,15.2,100.5   # eyeball every card
npx hyperframes render -o renders/film.mp4 -f 30 -q delivery --video-frame-format png
```

6. **Burn the captions.** This needs an ffmpeg built with libass; the Homebrew
   build is not. Real TrueType faces go in a `fontsdir` so libass does not fall
   back to DejaVu.

```bash
~/.local/bin/ffmpeg -y -i renders/film.mp4 \
  -vf "subtitles=tributary.srt:fontsdir=$FONTS:force_style='FontName=IBM Plex Mono,FontSize=11,PrimaryColour=&H003F2310,BorderStyle=3,BackColour=&H2AE2EFF5,Outline=0,Shadow=0,Alignment=2,MarginV=34,MarginL=40,MarginR=40'" \
  -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a copy \
  -movflags +faststart tributary-demo-film.mp4
```

The caption is a single line of Plex Mono on a translucent paper band, placed
over the site's own status strip — it reads as a receipt, not as a subtitle.

## Rebuilding the deck

Each slide is one HTML document sized exactly 1920×1080 with `overflow: hidden`,
so a screenshot cannot crop it and cannot overflow it.

```bash
# 1. raster check — every slide must report scroll [1920, 1080] and no overflow
node shoot-deck.mjs            # → deck/png/sNN.png
# 2. PDF — print the ten slides through Chromium at 1000×562.5 CSS px (= 16:9)
node pdf.mjs                   # reads pdf-shell-img.html → tributary-slides.pdf
```

Both scripts import Playwright and launch the local Chrome binary; edit the
`chromium.launch({ executablePath })` / import path to match the machine. The
0.5208 scale is required, not cosmetic: Chromium caps printing at 200 in per
dimension, so a 1920 px page is out of contract while a 1000 px page is not, and
the slide documents are fixed-size so they scale without reflowing.

## Known, accepted imperfections

- `hyperframes check` reports one standing warning: ~86 micro-type elements
  (sheet stamps, plan legends, drafting labels) sit below the 28 px reading
  floor. They are texture, carry `data-layout-ignore`, and are not meant to be
  read on a phone.
- Cut timing drifted from the storyboard sheet: the footprint-rejection shot is
  9 s (sheet said 7) and the containment card is 10 s (said 9). Total runtime is
  unchanged at 1:55.87.
