# Agent instructions

This repository contains a static website hosted on GitHub Pages. Keep changes compatible with static hosting and avoid introducing server-side runtime requirements.

Plugin set and remotes: `.cursor/rules/stupid-audio.mdc`.

# Stupid Audio website

Stupid Audio is the product line. Write direct, not brochure-speak. Do not advertise AI authorship on public pages. Never invent features.

## Voice

Public copy is professional and serious, with humor and humility. Straight sentences. Warm, not snarky.

Humor can name the product as it is (F4RT is a fart designer). Humor cannot dunk on the reader, on “pro” tools, on subscriptions, or on the competition. No sermons, no “steal them,” no “must-haves,” no Gatekeeper sulking.

Humble means one person, focused boxes, MIT, the site is the front door. It does not mean talking down or apologizing for the work.

## Landing (`docs/index.html`)

The intro lede is visitor copy in that voice. Do not rewrite it into catalog/hub instructions.
Instrument tiles link to `instruments.html#id`. Effect tiles link to `effects.html#id`.
Visible effects names use the Florin (`ƒN0B`, `ƒR3Z0`); IDs and URLs stay ASCII.

## Instruments (`docs/instruments.html`)

Give each plugin—TEW03, K1X, SNR3, 5HKR, V4JB, and F4RT—a 3-5 sentence blurb. Base every blurb on verified details from that plugin's checkout or GitHub remote; do not infer or invent features. Locate each project's logo in its checkout, include the logo, and use static asset paths that work on GitHub Pages. Keep plugin names, logos, and links consistent with the authoritative project sources.

Each plugin section has Website, Manual, Download, and GitHub.

## Effects (`docs/effects.html`)

Give each plugin—ƒR3Z0 then ƒN0B—a 3-5 sentence blurb from that plugin's checkout or GitHub remote. Same logo, shot, and action rules as Instruments. Meta is VST3 (do not claim standalone unless that plugin ships it).
