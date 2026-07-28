import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import analyzerCore from "../analyzer-core.js";
import audioCore from "../audio-core.js";

const { parseSrt, analyze, compareRange, countText, escapeHtml } = analyzerCore;
const { analyzePcm } = audioCore;

const profileSandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL("../profiles.js", import.meta.url), "utf8"), profileSandbox);
const profiles = profileSandbox.window.RHYTHM_PROFILES;
assert.equal(Object.keys(profiles).length, 14, "Should expose 14 voiceover-purpose presets");
for (const id of ["general-course", "general-news", "general-podcast"]) {
  assert.ok(profiles[id], `Missing ${id} preset`);
  assert.ok(profiles[id].metrics.cpmActive && profiles[id].metrics.wpmActive, `${id} should work for Chinese and English SRTs`);
}
for (const profile of Object.values(profiles)) {
  const silence = profile.metrics.silenceRatio;
  for (const [activeKey, timelineKey] of [["cpmActive", "cpmTimeline"], ["wpmActive", "wpmTimeline"]]) {
    const active = profile.metrics[activeKey];
    const timeline = profile.metrics[timelineKey];
    if (!active || !silence) continue;
    assert.equal(timeline.derived, true, `${timelineKey} should be derived from compatible targets`);
    assert.equal(timeline.min, Math.round(active.min * (1 - silence.max / 100)));
    assert.equal(timeline.max, Math.round(active.max * (1 - silence.min / 100)));
  }
}

// ── English fixture ──────────────────────────────────────
const english = analyze(parseSrt(fs.readFileSync(new URL("../fixtures/english-philosophy.srt", import.meta.url), "utf8")));
assert.equal(english.language, "en");
assert.equal(english.rows.length, 5);
assert.equal(english.totals.englishWords, 71);
assert.equal(english.totals.englishWpmActive, 214.7);
assert.equal(english.pauses.length, 4);
assert.equal(english.pauses[3].duration, 1.45);

// Public beta: descriptive pause-duration bands
assert.ok(english.pauses[0].type, "Pause should have a type");
assert.equal(english.pauses[3].type, "long", "1.45s pause should be in the long-duration band");

// v2: silence ratio
assert.ok(english.totals.silenceRatio > 0, "Silence ratio should be positive");
assert.ok(english.totals.silenceRatio < 50, "Silence ratio should be < 50% for this fixture");

// v2: pause frequency
assert.ok(english.totals.pausePer100 > 0, "Pause frequency should be positive");

// v2: pause types object
assert.ok(typeof english.pauseTypes === "object", "Pause types should be an object");
assert.ok(Object.keys(english.pauseTypes).length > 0, "Should have at least one pause type");

// v2: rate jumps
assert.ok(Array.isArray(english.rateJumps), "Rate jumps should be an array");

// ── Chinese fixture ──────────────────────────────────────
const chinese = analyze(parseSrt(fs.readFileSync(new URL("../fixtures/chinese-shortform.srt", import.meta.url), "utf8")));
assert.equal(chinese.language, "zh");
assert.equal(chinese.rows.length, 2);
assert.ok(chinese.totals.chineseCharacters > 0);
assert.ok(chinese.totals.chineseCpmActive > 0);
assert.equal(chinese.pauses.length, 1);
assert.equal(chinese.pauses[0].duration, 0.8);

assert.equal(chinese.pauses[0].type, "medium", "0.8s pause should be in the medium-duration band");

// v2: Chinese silence ratio
assert.ok(chinese.totals.silenceRatio > 0, "Chinese silence ratio should be positive");

// ── Overlap and mixed-language boundaries ────────────────
const overlap = analyze(parseSrt(`1\n00:00:00,000 --> 00:00:03,000\nFirst speaker talks.\n\n2\n00:00:02,000 --> 00:00:05,000\nSecond speaker overlaps.`));
assert.equal(overlap.totals.subtitleCoverageDuration, 5, "Overlapping subtitle coverage should be unioned");
assert.equal(overlap.totals.totalPauseDuration, 0, "Overlaps must not create negative gap time");
assert.equal(overlap.totals.hasOverlaps, true, "Report overlap boundary for review");

const mixedAnalysis = analyze(parseSrt(`1\n00:00:00,000 --> 00:00:03,000\n你好 hello world\n\n2\n00:00:03,500 --> 00:00:06,500\n继续 testing`));
assert.equal(mixedAnalysis.language, "mixed");
assert.equal(mixedAnalysis.totals.pausePer100, null, "Mixed language must not expose one combined pause frequency");
assert.equal(mixedAnalysis.variation.primaryRateStdDev, 0, "Mixed language must not select one primary rate");

// ── Local PCM audio QC ───────────────────────────────────
const pcm = new Float32Array([0, 0.5, -0.5, 1, -1, 0, 0, 0]);
const audio = analyzePcm(pcm, 4, [{ index: 1, start: 0, end: 1 }]);
assert.equal(audio.duration, 2);
assert.equal(audio.peakDbfs, 0);
assert.equal(audio.clippedSamples, 2);
assert.equal(audio.segments.length, 1);
assert.ok(audio.waveform.length > 0);

// ── compareRange utility ─────────────────────────────────
assert.equal(compareRange(170, { min: 150, max: 180 }).status, "ok");
assert.equal(compareRange(200, { min: 150, max: 180 }).status, "high");
assert.equal(compareRange(120, { min: 150, max: 180 }).status, "low");
assert.equal(compareRange(null, { min: 150, max: 180 }).status, "n/a");

// ── Mixed language counting ──────────────────────────────
const mixed = countText("这是 English 混合 text");
assert.equal(mixed.chineseCharacters, 4, "Should count 4 CJK chars");
assert.equal(mixed.englishWords, 2, "Should count 2 English words");

// ── Safe display encoding ───────────────────────────────
assert.equal(
  escapeHtml('<img src=x onerror="alert(1)">&'),
  '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;',
  "Subtitle text must be encoded before HTML rendering"
);

console.log("rhythm-analyzer: public-beta tests passed (4 fixtures, 25 assertions)");
