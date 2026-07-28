# Voxr

**Local rhythm QC for AI voiceover delivery.**

Voxr is a browser-only tool for reviewing an SRT timeline and, optionally, an authorized voiceover file. It is designed for AI video workflows that use cloned or synthesized narration: inspect timing, find clips worth replaying, and hand a concrete regeneration brief to the next TTS or editing step.

[中文说明](#中文) · [Methodology and limitations](METHODOLOGY.md) · [Agent Skill](skills/voxr-rhythm-review)

## What it does

- Parses `.srt` locally and reports subtitle coverage, timeline duration, gaps, Chinese CPM, English WPM, and rate changes.
- Offers delivery-purpose presets such as explainers, documentaries, product videos, short-form clips, and children’s content.
- Lets an authorized user import audio for **Audio QC Lite**: waveform, sample peak, RMS energy, near-full-scale samples, timeline duration difference, and low-energy cue review.
- Produces a timestamped action list and an exportable `voice-iteration-package.json` for a human or an AI agent.

## What it does not do

Voxr is a timing and lightweight signal-review aid, not a professional broadcast measurement suite. It does **not** currently measure LUFS, true peak, pitch/F0, emotion, intelligibility, phoneme alignment, speaker similarity, or copyright/voice consent. See the full [methodology and boundaries](METHODOLOGY.md) before relying on a result.

## Quick start

No build, account, upload, or server is required. Use a local HTTP server instead of opening files directly, so browser audio decoding behaves consistently.

```bash
git clone https://github.com/dlxeva/voxr.git
cd voxr
python3 -m http.server 4177
```

Open [http://localhost:4177](http://localhost:4177), then:

1. Choose the voiceover delivery purpose.
2. Add an `.srt` file. Optionally add the matching audio only if you have the right to use it.
3. Select **Start analysis**, review the flagged timecodes, and export the iteration package.

## Privacy and authorization

All current analysis runs in the browser. Voxr does not upload, store, transcribe, or send your SRT or audio to a service. The person using the tool remains responsible for having authorization to use a cloned voice, audio file, script, and any exported material.

The repository ignores common audio formats and generated iteration packages by default to reduce accidental commits of private source material. The demo SRT fixtures contain only synthetic example text.

## Local workflow position

Voxr is intentionally tool-agnostic. Our current local creative workflow commonly uses [Voicebox](https://github.com/jamiepine/voicebox) and [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) to create or clone authorized voices, then uses Voxr after rendering:

```text
Authorized reference + script → TTS / voice-cloning tool → WAV + SRT → Voxr → iteration package → next render
```

Voicebox and Qwen3-TTS are independent projects. Voxr neither bundles them nor calls their APIs; the JSON export is a generic handoff format rather than a direct integration.

## Agent Skill

The repository includes [`$voxr-rhythm-review`](skills/voxr-rhythm-review/SKILL.md), a small Agent Skill for turning an SRT report or an exported iteration package into a prioritized regeneration brief. It preserves the same boundaries as the web tool: no invented audio metrics and no consent assumptions.

## Development

```bash
node tests/run-tests.mjs
```

The tests cover parsing, rate calculations, overlap handling, mixed-language boundaries, safe rendering, and the local PCM metric primitives.

## Contributing

Issues and pull requests are welcome, especially for reproducible SRT edge cases, accessibility improvements, and clearly sourced methodology updates. Please do not include private audio, unlicensed voices, or real client scripts in issues, fixtures, or pull requests.

## License

[MIT](LICENSE)

## 中文

Voxr 是一个面向 AI 合成旁白交付的本地节奏质检工具。它先读取 SRT 的时间轴与文本，再可选读取一份已获授权的音频，帮助创作者定位需要回听或重配的段落，并导出可交给人或 AI 的迭代包。

它目前不是“专业音频测量仪”：不会报告 LUFS、True Peak、音高、情绪、可懂度或音色相似度；SRT 覆盖也不等于真实开口或静音。具体方法、参考和边界见 [METHODOLOGY.md](METHODOLOGY.md)。
