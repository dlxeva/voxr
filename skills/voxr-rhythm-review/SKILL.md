---
name: voxr-rhythm-review
description: Turn a Voxr SRT report or voice-iteration-package JSON into a prioritized, evidence-bound regeneration brief for authorized AI voiceover work. Use when reviewing SRT pacing, gap timing, or Voxr Audio QC Lite findings before a TTS or voice-cloning rerender.
---

# Voxr Rhythm Review

Use this skill when someone provides an SRT file, a Voxr HTML/JSON report, or a `voice-iteration-package.json` and wants precise next steps for an authorized synthesized voiceover.

## Inputs and boundary check

Accept one or more of the following:

- an `.srt` file or pasted SRT;
- a Voxr report or an exported `voice-iteration-package.json`;
- a stated delivery purpose and target audience;
- optional factual audio findings already measured by Voxr (peak, RMS, waveform, low-energy cues).
- optional listener notes such as “mechanical”, “rushed”, or “too flat”, ideally with one or two timecodes.

Before advising on a cloned voice or source audio, ask for confirmation of authorization if it is absent. Do not ask the user to upload audio to a third party merely to use this skill.

Read [the iteration-package reference](references/iteration-package.md) before interpreting an exported package.

## Review workflow

1. State what evidence is present: SRT-only timing, measured Audio QC Lite data, listener notes, or a combination.
2. When receiving JSON, validate `format = voxr.voice-iteration-package` and `version = 1`; use the canonical reference before interpreting fields.
3. If `parser.skippedBlockCount > 0`, lead with the parsing warning and ask for a repaired SRT before making a complete-file claim.
4. Treat SRT coverage and gaps as timeline facts, not proof of speaking duration or silence. Treat listener notes as hypotheses to replay, not acoustical measurements.
5. Use `languageDetail` when available. A Chinese-dominant SRT containing product names such as “AI” should remain Chinese-led; only `balanced-mixed` material should avoid a single primary-rate recommendation.
6. Rank at most five issues by user impact. Treat timestamp overlap as an explicit review signal, while noting it can be intentional for two speakers or bilingual tracks. Cite cue number and timecode for every issue.
7. For each priority, prescribe one reversible change: slow down, split at a clause, add/remove a pause, adjust a cue boundary, or replay/verify.
8. Provide a concise prompt that preserves the same authorized voice and names the intended pacing change. Do not instruct the user to imitate a real person without authorization.
9. End with the remaining uncertainties and the smallest useful next verification step.

## Output format

Return these sections in Chinese unless the user requests another language:

1. **结论** — one sentence naming the highest-impact risk.
2. **优先重配清单** — a table with timecode, observed evidence, change, and TTS/regeneration prompt.
3. **可保留部分** — only items supported by the supplied data.
4. **边界与下一步** — what cannot be inferred and whether to replay, inspect the waveform, or make a new SRT export.

## Measurement limits

Never turn these into claims unless the user supplies an independently measured result:

- LUFS or true peak;
- pitch/F0, stress, emotion, or intelligibility;
- speaker/voice-clone similarity;
- real spoken duration, breath capacity, or a causal explanation for an SRT gap.

“Mechanical” is not a diagnosis that can be derived from subtitle timing, PCM RMS, or a waveform. If a listener reports it, translate it into a reversible comparison instruction (for example, replay this clause with one deliberate phrase boundary), then ask the listener to compare the two renders.

Do not combine Chinese CPM and English WPM into a single rate. For mixed-language material, report each language separately and avoid one overall “normal” judgment.
