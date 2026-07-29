/**
 * Local SRT rhythm analyzer core — v2
 * No network calls; English words and CJK characters are counted separately.
 *
 * Public beta additions:
 *   - silenceRatio (% of timeline in pauses)
 *   - pauseFrequency (pauses per 100 words or 100 characters)
 *   - pause duration bands (short / medium / long / extended)
 *   - rate-jump detection (adjacent subtitle CPM/WPM delta)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RhythmAnalyzer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CJK_RE = /[\u3400-\u9FFF]/g;
  const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;

  // Duration bands are descriptive. Duration alone cannot establish a pause's intent.
  const PAUSE_TYPES = [
    { type: "short", min: 0.20, max: 0.50, label: "短间隔", enLabel: "Short" },
    { type: "medium", min: 0.50, max: 1.00, label: "中间隔", enLabel: "Medium" },
    { type: "long", min: 1.00, max: 3.00, label: "长间隔", enLabel: "Long" },
    { type: "extended", min: 3.00, max: Infinity, label: "超长间隔", enLabel: "Extended" },
  ];

  function toSeconds(time) {
    const match = String(time).trim().match(/^(\d+):(\d+):(\d+)[,.](\d{1,3})$/);
    if (!match) throw new Error(`Invalid SRT timestamp: ${time}`);
    const [, h, m, s, ms] = match;
    return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, "0")) / 1000;
  }

  function parseSrtDetailed(source) {
    const normalized = String(source).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
    if (!normalized) throw new Error("The SRT file is empty.");
    const entries = [];
    const warnings = [];
    const blocks = normalized.split(/\n\s*\n/);
    for (const [blockIndex, block] of blocks.entries()) {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
      const originalCueId = timeLineIndex > 0 ? lines.slice(0, timeLineIndex).join(" ") : timeLineIndex < 0 ? (lines[0] || null) : null;
      if (timeLineIndex < 0) {
        warnings.push({ block: blockIndex + 1, cueId: originalCueId, code: "missing-timestamp", message: "Skipped block without an SRT timestamp." });
        continue;
      }
      if (timeLineIndex === lines.length - 1) {
        warnings.push({ block: blockIndex + 1, cueId: originalCueId, code: "missing-text", message: "Skipped cue without subtitle text." });
        continue;
      }
      const match = lines[timeLineIndex].match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/);
      if (!match) {
        warnings.push({ block: blockIndex + 1, cueId: originalCueId, code: "invalid-timestamp", message: "Skipped cue with an invalid timestamp." });
        continue;
      }
      const text = lines.slice(timeLineIndex + 1).join(" ").replace(/<[^>]*>/g, "").trim();
      if (!text) {
        warnings.push({ block: blockIndex + 1, cueId: originalCueId, code: "empty-text", message: "Skipped cue with empty subtitle text." });
        continue;
      }
      try {
        const start = toSeconds(match[1]);
        const end = toSeconds(match[2]);
        if (end <= start) throw new Error("Cue ends before it starts.");
        entries.push({ index: entries.length + 1, originalCueId, start, end, text });
      } catch (error) {
        warnings.push({ block: blockIndex + 1, cueId: originalCueId, code: "invalid-cue-range", message: error.message });
      }
    }
    if (!entries.length) throw new Error("No valid subtitle entries found.");
    return {
      cues: entries.sort((a, b) => a.start - b.start),
      parsedCueCount: entries.length,
      skippedBlockCount: warnings.length,
      warnings,
      totalBlockCount: blocks.length,
    };
  }

  function parseSrt(source) {
    return parseSrtDetailed(source).cues;
  }

  function countText(text) {
    return {
      chineseCharacters: (text.match(CJK_RE) || []).length,
      englishWords: (text.match(WORD_RE) || []).length,
    };
  }

  function round(value, digits = 1) {
    const scale = 10 ** digits;
    return Math.round((value + Number.EPSILON) * scale) / scale;
  }

  function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function standardDeviation(values) {
    if (!values.length) return 0;
    const average = mean(values);
    return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
  }

  function classifyLanguage(counts) {
    const totalUnits = counts.chineseCharacters + counts.englishWords;
    if (!totalUnits) return { primary: "unknown", kind: "unknown", englishShare: 0 };
    if (!counts.englishWords) return { primary: "zh", kind: "zh", englishShare: 0 };
    if (!counts.chineseCharacters) return { primary: "en", kind: "en", englishShare: 1 };
    const englishShare = counts.englishWords / totalUnits;
    if (englishShare < 0.15) return { primary: "zh", kind: "zh-dominant", englishShare: round(englishShare, 3) };
    if (englishShare > 0.85) return { primary: "en", kind: "en-dominant", englishShare: round(englishShare, 3) };
    return { primary: "mixed", kind: "balanced-mixed", englishShare: round(englishShare, 3) };
  }

  /** Put a gap in one non-overlapping duration band. */
  function classifyPause(duration) {
    if (duration < 0.20) return { type: "other", label: "极短间隔", enLabel: "Very short" };
    if (duration < 0.50) return PAUSE_TYPES[0];
    if (duration < 1.00) return PAUSE_TYPES[1];
    if (duration < 3.00) return PAUSE_TYPES[2];
    return PAUSE_TYPES[3];
  }

  /**
   * Detect rate jumps only where both subtitles have enough duration and text.
   * Short labels create unstable instantaneous rates and are excluded on purpose.
   */
  function detectRateJumps(rows, language) {
    const rateKey = language === "zh" ? "cpm" : "wpm";
    const threshold = language === "zh" ? 40 : 30;
    const minUnits = language === "zh" ? 5 : 3;
    const jumps = [];
    for (let i = 1; i < rows.length; i++) {
      const previous = rows[i - 1];
      const current = rows[i];
      const previousUnits = language === "zh" ? previous.chineseCharacters : previous.englishWords;
      const currentUnits = language === "zh" ? current.chineseCharacters : current.englishWords;
      if (previous.duration < 1 || current.duration < 1 || previousUnits < minUnits || currentUnits < minUnits) continue;
      const prev = previous[rateKey];
      const curr = current[rateKey];
      if (prev != null && curr != null && Math.abs(curr - prev) > threshold) {
        jumps.push({
          between: [rows[i - 1].index, rows[i].index],
          delta: round(curr - prev),
          direction: curr > prev ? "sped up" : "slowed down",
        });
      }
    }
    return jumps;
  }

  function analyze(entries) {
    const rows = entries.map((entry) => {
      const counts = countText(entry.text);
      const duration = entry.end - entry.start;
      return {
        ...entry,
        duration: round(duration, 3),
        ...counts,
        cpm: counts.chineseCharacters ? round((counts.chineseCharacters / duration) * 60) : null,
        wpm: counts.englishWords ? round((counts.englishWords / duration) * 60) : null,
      };
    });

    const total = rows.reduce((acc, row) => ({
      chineseCharacters: acc.chineseCharacters + row.chineseCharacters,
      englishWords: acc.englishWords + row.englishWords,
      activeDuration: acc.activeDuration + row.duration,
    }), { chineseCharacters: 0, englishWords: 0, activeDuration: 0 });

    const timelineDuration = rows[rows.length - 1].end - rows[0].start;
    const intervals = rows.map((row) => [row.start, row.end]);
    let subtitleCoverageDuration = 0;
    let intervalStart = intervals[0][0];
    let intervalEnd = intervals[0][1];
    for (const [start, end] of intervals.slice(1)) {
      if (start <= intervalEnd) intervalEnd = Math.max(intervalEnd, end);
      else {
        subtitleCoverageDuration += intervalEnd - intervalStart;
        intervalStart = start;
        intervalEnd = end;
      }
    }
    subtitleCoverageDuration += intervalEnd - intervalStart;
    const hasOverlaps = subtitleCoverageDuration < total.activeDuration;
    const totalPauseDurationRaw = Math.max(0, timelineDuration - subtitleCoverageDuration);

    // Pauses with classification
    const pauses = rows.slice(1).map((row, index) => {
      const duration = Math.max(0, row.start - rows[index].end);
      const classified = classifyPause(duration);
      return {
        after: rows[index].index,
        before: row.index,
        duration: round(duration, 3),
        type: classified.type,
        typeLabel: classified.label,
        typeEnLabel: classified.enLabel,
      };
    }).filter((pause) => pause.duration > 0);

    const languageInfo = classifyLanguage(total);
    const language = languageInfo.primary;

    // Pause statistics
    const pauseDurations = pauses.map((p) => p.duration);
    const pauseCount = pauses.length;
    const silenceRatio = timelineDuration > 0
      ? round((totalPauseDurationRaw / timelineDuration) * 100)
      : 0;
    const avgPauseDuration = pauseCount ? round(mean(pauseDurations)) : 0;

    // Pause frequency per 100 units
    const unitCount = language === "zh" ? total.chineseCharacters : language === "en" ? total.englishWords : 0;
    const pausePer100 = unitCount > 0
      ? round((pauseCount / unitCount) * 100, 1)
      : null;

    // Pause type distribution
    const pauseTypeStats = {};
    for (const pt of PAUSE_TYPES) {
      const matches = pauses.filter((p) => p.type === pt.type);
      if (matches.length) {
        pauseTypeStats[pt.type] = {
          count: matches.length,
          totalDuration: round(matches.reduce((s, p) => s + p.duration, 0)),
          avgDuration: round(mean(matches.map((p) => p.duration))),
          label: pt.label,
          enLabel: pt.enLabel,
        };
      }
    }
    // Include "other" for out-of-range pauses
    const otherPauses = pauses.filter((p) => p.type === "other");
    if (otherPauses.length) {
      pauseTypeStats.other = {
        count: otherPauses.length,
        totalDuration: round(otherPauses.reduce((s, p) => s + p.duration, 0)),
        avgDuration: round(mean(otherPauses.map((p) => p.duration))),
        label: "其他",
        enLabel: "Other",
      };
    }

    const primaryRates = language === "zh"
      ? rows.map((row) => row.cpm).filter(Number.isFinite)
      : language === "en" ? rows.map((row) => row.wpm).filter(Number.isFinite) : [];

    const rateJumps = detectRateJumps(rows, language);
    const overlaps = rows.slice(1).map((row, index) => {
      const previous = rows[index];
      const duration = Math.max(0, previous.end - row.start);
      return duration > 0 ? { first: previous.index, second: row.index, duration: round(duration, 3) } : null;
    }).filter(Boolean);

    return {
      language,
      languageDetail: languageInfo.kind,
      languageComposition: {
        chineseCharacters: total.chineseCharacters,
        englishWords: total.englishWords,
        englishUnitShare: languageInfo.englishShare,
      },
      totals: {
        ...total,
        activeDuration: round(total.activeDuration, 3),
        subtitleCoverageDuration: round(subtitleCoverageDuration, 3),
        hasOverlaps,
        timelineDuration: round(timelineDuration, 3),
        totalPauseDuration: round(totalPauseDurationRaw, 3),
        silenceRatio,
        avgPauseDuration,
        pauseCount,
        pausePer100,
        chineseCpmActive: total.chineseCharacters ? round((total.chineseCharacters / total.activeDuration) * 60) : null,
        englishWpmActive: total.englishWords ? round((total.englishWords / total.activeDuration) * 60) : null,
        chineseCpmTimeline: total.chineseCharacters ? round((total.chineseCharacters / timelineDuration) * 60) : null,
        englishWpmTimeline: total.englishWords ? round((total.englishWords / timelineDuration) * 60) : null,
      },
      pauseTypes: pauseTypeStats,
      variation: {
        primaryRateStdDev: round(standardDeviation(primaryRates)),
        fastest: primaryRates.length ? round(Math.max(...primaryRates)) : null,
        slowest: primaryRates.length ? round(Math.min(...primaryRates)) : null,
      },
      rateJumps,
      overlaps,
      pauses,
      rows,
    };
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = round(seconds - minutes * 60, 1).toFixed(1).padStart(4, "0");
    return `${String(minutes).padStart(2, "0")}:${secs}`;
  }

  /**
   * Compare a measured value against a profile range.
   * Returns { status, label } where status is "ok" | "high" | "low" | "n/a".
   */
  function compareRange(value, range) {
    if (value == null || !range) return { status: "n/a", label: "—" };
    const numericValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numericValue)) return { status: "n/a", label: "—" };
    if (numericValue > range.max) return { status: "high", label: `↑ ${numericValue} (max ${range.max})` };
    if (numericValue < range.min) return { status: "low", label: `↓ ${numericValue} (min ${range.min})` };
    return { status: "ok", label: `${numericValue} ✓` };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return { parseSrt, parseSrtDetailed, analyze, countText, formatTime, compareRange, escapeHtml, PAUSE_TYPES };
});
