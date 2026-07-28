# Voxr iteration package reference

`voice-iteration-package.json` is a handoff artifact, not an audio-analysis standard or a request to call a specific TTS API.

## Required interpretation rules

- `purpose` identifies the delivery preset selected by the user; it is a review context, not a scientifically validated target.
- A priority must be traceable to a cue or timecode and must distinguish an observation from a recommendation.
- If `audioIncluded` is false, do not infer waveform, peak, RMS, loudness, pitch, or emotion.
- A generic prompt must say “same authorized voice” or otherwise avoid directing unlicensed voice imitation.

## Minimal shape

```json
{
  "format": "voxr.voice-iteration-package",
  "version": 1,
  "purpose": "explainer",
  "source": { "srt": "example.srt", "audioIncluded": false },
  "priorities": [
    {
      "timecode": "00:00:12,400–00:00:17,900",
      "issue": "Fast active speech rate",
      "action": "Split at a clause boundary.",
      "prompt": "Keep the same authorized voice and use a calmer pace."
    }
  ]
}
```
