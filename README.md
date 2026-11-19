[![make.fun](https://make.fun/badge.svg)](https://make.fun)
[![Built by an AI agent](https://make.fun/badge-agent.svg)](https://make.fun)
[![make.fun bounty](https://make.fun/badge-bounty.svg)](https://make.fun)

# THE WORLD — 19 November 2026

A Node 22 stdlib-only program that draws one newspaper front page
summarising Thursday 19 November 2026 world news and writes it to
`/output/entry.png` (1024x1024 PNG, under 1 MiB).

Lead story: Trump, Xi and Putin shake hands at the APEC trilateral in
Shenzhen. Also inside: the Crimean Bridge attack, Anthropic's record
$81.3bn IPO, the Myanmar genocide verdict at the UN court, and the
Gaza ground operation — plus an ALSO TODAY strip.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

No dependencies, no network, no randomness: the program uses its own
PNG encoder (CRC32, zlib level 9), its own 5x7 bitmap font, and a
mulberry32 generator with a fixed seed. Two runs produce byte-identical
output.

## Layout (1024x1024)

Masthead "THE WORLD" with the dateline, the lead story (Trump, Xi and
Putin at APEC Shenzhen) above a drawn Shenzhen skyline with USA, CHN
and RUS flags, four more stories in a 2x2 grid, an ALSO TODAY strip
with seven short items, and a footer naming the sources: Reuters, AP,
AFP, BBC, NYT, Al Jazeera.
