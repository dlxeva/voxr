/**
 * Local audio QC primitives.
 * These calculations describe decoded PCM amplitude only. They do not measure
 * LUFS, true peak, pitch, emotion, intelligibility, or speaker identity.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LocalAudioQC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function round(value, digits = 1) {
    const scale = 10 ** digits;
    return Math.round((value + Number.EPSILON) * scale) / scale;
  }

  function dbfs(value) {
    return value > 0 ? round(20 * Math.log10(value)) : -Infinity;
  }

  function measureRange(samples, start, end) {
    const from = Math.max(0, Math.floor(start));
    const to = Math.min(samples.length, Math.ceil(end));
    if (to <= from) return { peak: 0, peakDbfs: -Infinity, rms: 0, rmsDbfs: -Infinity, clippedSamples: 0 };
    let peak = 0;
    let sumSquares = 0;
    let clippedSamples = 0;
    for (let index = from; index < to; index++) {
      const absolute = Math.abs(samples[index]);
      peak = Math.max(peak, absolute);
      sumSquares += samples[index] ** 2;
      if (absolute >= 0.999) clippedSamples++;
    }
    const rms = Math.sqrt(sumSquares / (to - from));
    return { peak: round(peak, 4), peakDbfs: dbfs(peak), rms: round(rms, 4), rmsDbfs: dbfs(rms), clippedSamples };
  }

  function waveform(samples, bins = 160) {
    const result = [];
    const size = Math.max(1, Math.ceil(samples.length / bins));
    for (let start = 0; start < samples.length; start += size) {
      let min = 1;
      let max = -1;
      for (let index = start; index < Math.min(start + size, samples.length); index++) {
        min = Math.min(min, samples[index]);
        max = Math.max(max, samples[index]);
      }
      result.push({ min: round(min, 3), max: round(max, 3) });
    }
    return result;
  }

  function analyzePcm(samples, sampleRate, subtitleRows = []) {
    const duration = samples.length / sampleRate;
    const overall = measureRange(samples, 0, samples.length);
    return {
      duration: round(duration, 3),
      sampleRate,
      peak: overall.peak,
      peakDbfs: overall.peakDbfs,
      rmsDbfs: overall.rmsDbfs,
      clippedSamples: overall.clippedSamples,
      waveform: waveform(samples),
      segments: subtitleRows.map((row) => ({
        index: row.index,
        start: row.start,
        end: row.end,
        ...measureRange(samples, row.start * sampleRate, row.end * sampleRate),
      })),
    };
  }

  return { analyzePcm, measureRange, waveform };
});
