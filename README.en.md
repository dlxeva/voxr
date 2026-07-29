# Voxr

> This is the English documentation. The primary project documentation is available in [Chinese](README.md).

[![License: MIT](https://img.shields.io/badge/License-MIT-f0c675?style=flat-square)](LICENSE)
![Processing: local in browser](https://img.shields.io/badge/Processing-local%20in%20browser-496b5b?style=flat-square)
![Server: not required](https://img.shields.io/badge/Server-not%20required-6a5b87?style=flat-square)
![Agent Skill: included](https://img.shields.io/badge/Agent%20Skill-included-8a5c3f?style=flat-square)

**Local rhythm review and workflow handoff for AI-synthesized voiceover delivery.**

[中文](README.md) · [Methodology, references, and boundaries](METHODOLOGY.md) · [Agent Skill](skills/voxr-rhythm-review) · [Iteration package schema](schemas/voxr.voice-iteration-package.schema.json)

Voxr is a browser-only tool for reviewing an SRT timeline and, optionally, an authorized voiceover file. It helps AI-video creators inspect timing, identify clips worth reviewing first, and hand an evidence-based regeneration brief to the next TTS or editing step.

## What it does

- Parses `.srt` locally and reports subtitle coverage, timeline duration, gaps, Chinese CPM, English WPM, and rate changes between adjacent clips.
- Offers production-review presets for explainers, documentaries, product videos, short-form clips, and children’s content.
- Lets an authorized user import audio for **Audio QC Lite**: waveform, sample peak, RMS energy, near-full-scale samples, first-cue/tail timing cues, and low-energy cue review.
- Produces timestamped review suggestions and an exportable `voice-iteration-package.json` for a human or an AI agent.

## What it does not do

Voxr is a timing and lightweight signal-review aid, not a professional broadcast measurement suite. It does **not** measure LUFS, true peak, pitch/F0, emotion, intelligibility, phoneme alignment, speaker similarity, or copyright/voice consent. It treats subtitle coverage and gaps as timeline facts; they are not proof of actual speech or silence.

Read [Methodology, references, and boundaries](METHODOLOGY.md) before acting on a result.

## Quick start

No build, account, upload, or server is required. Use a local HTTP server rather than opening files directly, so browser audio decoding behaves consistently.

```bash
git clone https://github.com/dlxeva/voxr.git
cd voxr
python3 -m http.server 4177
```

Open [http://localhost:4177](http://localhost:4177), then:

1. Choose the voiceover delivery purpose.
2. Add an `.srt` file. Optionally add matching audio only if you have the right to use it.
3. Select **Start analysis**, review the suggested timecodes, and export the iteration package.

## Privacy and authorization

All current analysis runs in the browser. Voxr does not upload, store, transcribe, or send your SRT or audio to a service. You remain responsible for having authorization to use a cloned voice, audio file, script, and exported material.

The repository ignores common audio formats and generated iteration packages by default to reduce accidental commits of private material. Demo SRT fixtures contain only synthetic example text.

## Methodology

Voxr is informed by common subtitle-timeline QC practice: cue duration, rate, adjacent gaps, and overlaps identify timecodes worth review. It translates those findings into regeneration actions and generic prompt/JSON handoff for synthesized-voice workflows. This is an independent implementation and does not copy third-party web-tool code.

Published research supports the measurement direction—speech rate, context, and pauses can affect perception or intelligibility—but does not directly derive any Voxr preset. The full rationale, five checkable references, and known limitations are in [METHODOLOGY.md](METHODOLOGY.md).

## Position in a local workflow

Voxr is tool-agnostic. Our current local creative workflow commonly uses [Voicebox](https://github.com/jamiepine/voicebox) and [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) to create or clone authorized voices, then uses Voxr after rendering.

```text
Authorized reference + script → TTS / voice-cloning tool → WAV + SRT → Voxr → iteration package → next render
```

Voicebox and Qwen3-TTS are independent projects. Voxr neither bundles them nor calls their APIs; the JSON export is a generic handoff, not a direct integration.

## Agent Skill

The repository includes [`$voxr-rhythm-review`](skills/voxr-rhythm-review/SKILL.md), a small Agent Skill that turns an SRT report or exported iteration package into a prioritized regeneration brief. It validates the v1 package contract, preserves parsing warnings, and keeps the same evidence and authorization boundaries as the web tool.

## Development and contributing

Run:

```bash
node tests/run-tests.mjs
```

The tests cover parsing, rate calculations, overlap handling, mixed-language boundaries, safe rendering, and local PCM metric primitives.

Issues and pull requests are welcome, especially for reproducible SRT edge cases, accessibility improvements, and clearly sourced methodology updates. Do not include private audio, unlicensed voices, or real client scripts in issues, fixtures, or pull requests.

## License

[MIT](LICENSE)
