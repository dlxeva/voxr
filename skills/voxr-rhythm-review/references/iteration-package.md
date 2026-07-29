# Voxr iteration package reference

`voice-iteration-package.json` is a handoff artifact, not an audio-analysis standard or a request to call a specific TTS API. The canonical machine-readable contract is [the v1 JSON Schema](../../../schemas/voxr.voice-iteration-package.schema.json).

## Required interpretation rules

- `purpose` identifies the delivery preset selected by the user; it is a review context, not a scientifically validated target.
- A priority must be traceable to a cue or timecode and must distinguish an observation from a recommendation.
- If `source.audioIncluded` is false, do not infer waveform, peak, RMS, loudness, pitch, or emotion.
- A generic prompt must say “same authorized voice” or otherwise avoid directing unlicensed voice imitation.
- If `parser.skippedBlockCount` is greater than zero, state that the source was only partially parsed. A strict downstream workflow should require the source SRT to be repaired before treating the package as complete.
- `timeline.firstCueOffset` means time before the first subtitle begins; `timeline.lastCueEnd` is the final subtitle end. When `audioQC.alignment.audioTailGap` exists, it means audio remaining after that final subtitle, not a general “audio/SRT offset”.
- `measurements.languageDetail` is the dominant-language decision used to choose a CPM or WPM reference. `measurements` are facts from the current run; `priorities` are bounded review recommendations based on them.
- `profile.metrics.*.derived: true` means that timeline guidance is explicitly derived from the active-rate range and the profile's gap range. It is still a production reference, not a clinical or universal threshold.

## Minimal shape

```json
{
  "format": "voxr.voice-iteration-package",
  "version": 1,
  "workflow": "voiceover-rhythm-iteration",
  "generatedAt": "2026-07-29T00:00:00.000Z",
  "purpose": { "id": "general-explainer", "label": "知识解说", "status": "reference" },
  "source": { "srtFile": "example.srt", "audioIncluded": false, "audioFile": null, "audioAuthorizationConfirmed": false },
  "inputBoundary": { "timing": "SRT text and timestamps", "audio": "No audio measurement included", "excluded": ["LUFS", "emotion"] },
  "profile": { "id": "general-explainer", "label": "知识解说", "status": "reference", "profileVersion": "0.2.0", "evidenceLevel": "heuristic-production-reference", "lastCalibratedAt": null },
  "timeline": { "firstCueOffset": 0, "lastCueEnd": 17.9, "subtitleSpan": 17.9, "subtitleCoverageDuration": 12.2, "subtitleGapRatio": 31.8 },
  "measurements": { "language": "zh", "languageDetail": "zh-dominant", "languageComposition": { "chineseCharacters": 42, "englishWords": 1, "englishUnitShare": 0.023 }, "activeRate": 218.4, "timelineRate": 162.1, "rateUnit": "CPM", "pauseCount": 3, "pausePer100": 7.1, "overlaps": [] },
  "priorities": [
    {
      "priority": 3,
      "timecode": "00:00:12,400–00:00:17,900",
      "issue": "Fast active speech rate",
      "recommendation": "Split at a clause boundary.",
      "prompt": "Keep the same authorized voice and use a calmer pace."
    }
  ],
  "audioQC": null
}
```
