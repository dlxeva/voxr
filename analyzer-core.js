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
    { type: "short", min: 0.20, max: 0.49, label: "短间隔", enLabel: "Short" },
    { type: "medium", min: 0.50, max: 0.99, label: "中间隔", enLabel: "Medium" },
    { type: "long", min: 1.00, max: 2.99, label: "长间隔", enLabel: "Long" },
    { type: "extended", min: 3.00, max: Infinity, label: "超长间隔", enLabel: "Extended" },
  ];

  function toSeconds(time) {
    const match = String(time).trim().match(/^(\d+):(\d+):(\d+)[,.](\d{1,3})$/);
    if (!match) throw new Error(`Invalid SRT timestamp: ${time}`);
    const [, h, m, s, ms] = match;
    return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, "0")) / 1000;
  }

  function parseSrt(source) {
    const normalized = String(source).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
    if (!normalized) throw new Error("The SRT file is empty.");
    const entries = [];
    for (const block of normalized.split(/\n\s*\n/)) {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeLineIndex < 0 || timeLineIndex === lines.length - 1) continue;
      const match = lines[timeLineIndex].match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/);
      if (!match) continue;
      const text = lines.slice(timeLineIndex + 1).join(" ").replace(/<[^>]*>/g, "").trim();
      if (!text) continue;
      const start = toSeconds(match[1]);
      const end = toSeconds(match[2]);
      if (end <= start) throw new Error("An SRT entry ends before it starts.");
      entries.push({ index: entries.length + 1, start, end, text });
    }
    if (!entries.length) throw new Error("No valid subtitle entries found.");
    return entries.sort((a, b) => a.start - b.start);
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
    if (counts.chineseCharacters && counts.englishWords) return "mixed";
    if (counts.chineseCharacters) return "zh";
    return "en";
  }

  /** Put a gap in one non-overlapping duration band. */
  function classifyPause(duration) {
    const types = PAUSE_TYPES.filter(
      (pt) => duration >= pt.min && duration <= pt.max
    );
    return types.length ? types[0] : { type: "other", label: "极短间隔", enLabel: "Very short" };
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

    const language = classifyLanguage(total);

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

    return {
      language,
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
    if (value > range.max) return { status: "high", label: `↑ ${value} (max ${range.max})` };
    if (value < range.min) return { status: "low", label: `↓ ${value} (min ${range.min})` };
    return { status: "ok", label: `${value} ✓` };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return { parseSrt, analyze, countText, formatTime, compareRange, escapeHtml, PAUSE_TYPES };
});
