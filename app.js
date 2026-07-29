const $ = (selector) => document.querySelector(selector);
const RA = () => window.RhythmAnalyzer;
const fileInput = $("#srt-file");
const audioInput = $("#audio-file");
const profileSelect = $("#profile");
const dropZone = $("#drop-zone");
const audioDropZone = $("#audio-drop-zone");
const audioConsent = $("#audio-consent-input");
const recorderConsole = $(".recorder-console");
const deskAudioPlayer = $("#desk-audio-player");
const recorderPlay = $("#recorder-play");
let currentAnalysis = null;
let currentAudioAnalysis = null;
let currentAudioFileName = null;
let currentAudioPcm = null;
let currentAudioSampleRate = null;
let currentAudioUrl = null;
let pendingSrtFile = null;
let pendingAudioFile = null;
let currentParseReport = null;
let analysisIsCurrent = false;
let locale = "zh";

const UI_COPY = {
  zh: {
    title: "合成旁白节奏检查", kicker: "本地处理 · 合成旁白质检 · Beta",
    lede: "导入配音生成后的 SRT，定位需要重配的时间点，并导出可交给 AI 或 TTS 的修改包。适用于授权音色克隆与合成旁白的交付复盘。",
    profile: "配音用途", drop: "把生成后的 <code>.srt</code> 文件拖到这里", choose: "或选择一个文件",
    start: "从本地开始", startCopy: "选择或拖入一份生成后的 SRT。分析只在当前浏览器中运行，字幕内容不会离开你的设备。",
    groups: { zh: "中文内容", en: "英文内容", universal: "通用内容" },
    heroInstruction: "先标记交付用途，再把生成结果放上工作台。", recorderEmpty: "NO TAPE LOADED", recorderReady: "TAPE LOADED · LOCAL ONLY", recorderPlay: "载入音频后试听", recorderPause: "暂停试听", recorderResume: "试听本地音频",
  },
  en: {
    title: "Synthetic Voiceover Rhythm Check", kicker: "LOCAL ONLY · VOICEOVER QA · BETA",
    lede: "Upload an SRT produced after voice generation. Find the clips worth regenerating and export a change package for your AI or TTS workflow.",
    profile: "Delivery purpose", drop: "Drop a generated <code>.srt</code> file here", choose: "or choose a file",
    start: "Start locally", startCopy: "Choose or drop a generated SRT. Processing stays in this browser and your subtitle text stays on your device.",
    groups: { zh: "Chinese content", en: "English content", universal: "General use" },
    heroInstruction: "Mark the delivery purpose, then place the render on the desk.", recorderEmpty: "NO TAPE LOADED", recorderReady: "TAPE LOADED · LOCAL ONLY", recorderPlay: "Load audio to preview", recorderPause: "Pause preview", recorderResume: "Preview local audio",
  },
};

function profileLanguage(id) { return id.startsWith("zh-") ? "zh" : id.startsWith("en-") ? "en" : "universal"; }
function profileName(id, profile) {
  const en = {
    "zh-documentary": "Chinese · Documentary / Long-form narrative", "zh-explainer": "Chinese · Explainer", "zh-product": "Chinese · Product / Brand film", "zh-shortform": "Chinese · Short-form / Talking head", "zh-children": "Chinese · Children's content",
    "en-documentary": "English · Documentary", "en-explainer": "English · Explainer / Tutorial", "en-product": "English · Product launch", "en-shortform": "English · Short video / Ad", "en-children": "English · Children's content", interview: "Interview / Conversation",
    "general-course": "General · Course / Teaching", "general-news": "General · News / Briefing", "general-podcast": "General · Podcast / Edited interview",
  };
  return locale === "en" ? (en[id] || profile.label) : profile.label;
}

function renderProfiles() {
  const selected = profileSelect.value;
  profileSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = locale === "zh" ? "请选择配音用途" : "Choose a voiceover purpose";
  placeholder.disabled = true;
  placeholder.selected = !selected;
  profileSelect.append(placeholder);
  ["zh", "en", "universal"].forEach((group) => {
    const entries = Object.entries(window.RHYTHM_PROFILES).filter(([id]) => profileLanguage(id) === group);
    if (!entries.length) return;
    const optgroup = document.createElement("optgroup");
    optgroup.label = UI_COPY[locale].groups[group];
    entries.forEach(([id, profile]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = profileName(id, profile);
      optgroup.append(option);
    });
    profileSelect.append(optgroup);
  });
  profileSelect.value = selected;
}

function setLocale(nextLocale) {
  locale = nextLocale;
  const copy = UI_COPY[locale];
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  document.title = locale === "zh" ? "合成旁白节奏检查｜本地 SRT 复盘" : "Synthetic Voiceover Rhythm Check | Local SRT review";
  $("#privacy-kicker").textContent = copy.kicker;
  $("#page-title").textContent = copy.title;
  $("#page-lede").textContent = copy.lede;
  $("#profile-label").childNodes[1].nodeValue = copy.profile;
  profileSelect.setAttribute("aria-label", copy.profile);
  $("#drop-copy").innerHTML = copy.drop;
  $("#drop-action").textContent = copy.choose;
  $("#empty-title").textContent = copy.start;
  $("#empty-copy").textContent = copy.startCopy;
  $(".hero-instruction").textContent = copy.heroInstruction;
  document.querySelectorAll("[data-locale]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.locale === locale)));
  renderProfiles();
  if (currentAnalysis) render(currentAnalysis, $("#filename").textContent);
  updateRecorderState();
}

function updateRecorderState() {
  const hasAudio = Boolean(pendingAudioFile && currentAudioUrl);
  const copy = UI_COPY[locale];
  recorderConsole.classList.toggle("has-audio", hasAudio);
  recorderPlay.disabled = !hasAudio;
  if (deskAudioPlayer.dataset.objectUrl !== (currentAudioUrl || "")) {
    deskAudioPlayer.pause();
    deskAudioPlayer.src = currentAudioUrl || "";
    deskAudioPlayer.dataset.objectUrl = currentAudioUrl || "";
  }
  if (!hasAudio) {
    recorderConsole.classList.remove("is-playing");
    $("#recorder-status").textContent = copy.recorderEmpty;
    $("#recorder-play-label").textContent = copy.recorderPlay;
  } else if (!recorderConsole.classList.contains("is-playing")) {
    $("#recorder-status").textContent = copy.recorderReady;
    $("#recorder-play-label").textContent = copy.recorderResume;
  }
}

function updateReadyState() {
  const button = $("#analyze");
  const status = $("#ready-state");
  const hasPurpose = Boolean(profileSelect.value);
  button.disabled = !pendingSrtFile || !hasPurpose;
  if (!hasPurpose) status.textContent = "第一步：先选择配音用途，再上传 SRT 或音频。";
  else if (!pendingSrtFile) status.textContent = "下一步：上传一份 SRT，再开始分析。";
  else if (pendingAudioFile && !audioConsent.checked) status.textContent = "音频已就绪；勾选授权确认后即可开始联合检查。";
  else if (pendingAudioFile) status.textContent = "SRT 与音频已就绪。开始分析会生成节奏报告和本地 Audio QC。";
  else status.textContent = "SRT 已就绪。可直接开始节奏分析，也可补充对应音频。";
  updateUploadStates();
}

function fileLabel(file) {
  if (!file) return "";
  const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
  return `已选择：${file.name} · ${size}`;
}

function updateUploadStates() {
  const srtStatus = $("#srt-status");
  const audioStatus = $("#audio-status");
  dropZone.classList.toggle("is-ready", Boolean(pendingSrtFile));
  audioDropZone.classList.toggle("is-ready", Boolean(pendingAudioFile));
  srtStatus.textContent = pendingSrtFile ? fileLabel(pendingSrtFile) : "尚未选择文件";
  audioStatus.textContent = pendingAudioFile
    ? `${fileLabel(pendingAudioFile)}${audioConsent.checked ? " · 已确认授权" : " · 等待授权确认"}`
    : "可选：未选择音频";
  updateRecorderState();
}

function metric(label, value, note = "", statusClass = "") {
  return `<article class="metric ${statusClass}"><span>${label}</span><strong>${value ?? "—"}</strong><small>${note}</small></article>`;
}

function formatRate(analysis, active = true) {
  const t = analysis.totals;
  const suffix = active ? "字幕覆盖时长" : "完整时间线";
  if (analysis.language === "zh") return `${active ? t.chineseCpmActive : t.chineseCpmTimeline} CPM <small>${suffix}</small>`;
  if (analysis.language === "en") return `${active ? t.englishWpmActive : t.englishWpmTimeline} WPM <small>${suffix}</small>`;
  return `${active ? t.chineseCpmActive : t.chineseCpmTimeline} CPM + ${active ? t.englishWpmActive : t.englishWpmTimeline} WPM <small>${suffix}</small>`;
}

/**
 * Build a benchmark comparison row.
 * Shows measured value vs profile range with ok/high/low indicator.
 */
function benchmarkRow(label, measured, range, unit = "") {
  if (!range) return "";
  const cmp = RA().compareRange(measured, range);
  const rangeStr = `${range.min}–${range.max}${unit}`;
  const measuredText = measured == null ? "—" : `${measured}${unit}`;
  return `<tr class="${cmp.status}">
    <td>${label}</td>
    <td class="val">${measuredText}</td>
    <td class="target">${rangeStr}</td>
    <td class="flag ${cmp.status}">${cmp.status === "ok" ? "✓ 区间内" : cmp.status === "high" ? "↑ 偏高" : cmp.status === "low" ? "↓ 偏低" : "—"}</td>
  </tr>`;
}

function profilePanel() {
  const profile = window.RHYTHM_PROFILES[profileSelect.value];
  return `
    <section class="profile">
      <p class="eyebrow">制作参考</p>
      <h2>${profile.label}</h2>
      <p>${profile.summary}</p>
      <ul>${profile.reviewCues.map((cue) => `<li>${cue}</li>`).join("")}</ul>
    </section>`;
}

/** Benchmark table comparing measured values against the selected profile. */
function benchmarkPanel(analysis) {
  const profile = window.RHYTHM_PROFILES[profileSelect.value];
  if (analysis.language === "mixed") {
    return `<section class="profile"><p class="eyebrow">复盘提示</p><p>中英混合字幕分别显示 CPM 与 WPM，不生成单一的场景基准判断。</p></section>`;
  }
  if (!profile.metrics || Object.keys(profile.metrics).length === 0) {
    return `<section class="profile"><p class="eyebrow">复盘提示</p><p>访谈和对话没有固定的数值区间。请结合说话者、画面和语境检查可听性。</p></section>`;
  }

  const t = analysis.totals;
  const isZh = analysis.language === "zh";
  const rateKey = isZh ? "cpm" : "wpm";

  // Pick the right metric keys based on language
  const activeKey = isZh ? "cpmActive" : "wpmActive";
  const timelineKey = isZh ? "cpmTimeline" : "wpmTimeline";
  const activeValue = isZh ? t.chineseCpmActive : t.englishWpmActive;
  const timelineValue = isZh ? t.chineseCpmTimeline : t.englishWpmTimeline;

  const rows = [
    profile.metrics[activeKey] ? benchmarkRow("字幕覆盖语速", activeValue, profile.metrics[activeKey], profile.metrics[activeKey].unit) : "",
    profile.metrics[timelineKey] ? benchmarkRow("时间线语速", timelineValue, profile.metrics[timelineKey], profile.metrics[timelineKey].unit) : "",
    profile.metrics.silenceRatio ? benchmarkRow("字幕覆盖外时间占比", t.silenceRatio, profile.metrics.silenceRatio, "%") : "",
    profile.metrics.pausePer100 && t.pausePer100 != null ? benchmarkRow("每百字词间隔", t.pausePer100, profile.metrics.pausePer100, profile.metrics.pausePer100.unit) : "",
  ].filter(Boolean).join("");

  return `
    <section class="profile">
      <p class="eyebrow">制作参考 · ${profile.label}</p>
      <table class="benchmark"><thead><tr><th>指标</th><th>当前值</th><th>参考区间</th><th>提示</th></tr></thead><tbody>${rows}</tbody></table>
    </section>`;
}

/** Pause type distribution panel with colored chips. */
function pauseTypesPanel(analysis) {
  const types = analysis.pauseTypes;
  if (!Object.keys(types).length) return "";

  const typeOrder = ["short", "medium", "long", "extended", "other"];
  const rows = typeOrder
    .filter((key) => types[key])
    .map((key) => {
      const t = types[key];
      return `<tr class="pause-${key}">
        <td><span class="chip pause-${key}">${t.enLabel}</span> ${t.label}</td>
        <td>${t.count}</td>
        <td>${t.totalDuration}s</td>
        <td>${t.avgDuration}s avg</td>
      </tr>`;
    })
    .join("");

  return `
    <section class="profile">
      <p class="eyebrow">字幕间隔时长</p>
      <table class="benchmark"><thead><tr><th>时长层级</th><th>次数</th><th>合计</th><th>平均</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="hint">时长只能提示需要回看的位置，不能判断停顿意图。</p>
    </section>`;
}

/** Rate jump warnings panel. */
function rateJumpsPanel(analysis) {
  if (!analysis.rateJumps.length) return "";

  const rows = analysis.rateJumps.map((jump) => {
    const arrow = jump.direction === "sped up" ? "↑" : "↓";
    const direction = jump.direction === "sped up" ? "加快" : "放慢";
    return `<tr class="${jump.direction === "sped up" ? "rate-spike" : "rate-drop"}">
      <td>#${jump.between[0]} → #${jump.between[1]}</td>
      <td>${arrow} ${Math.abs(jump.delta)}</td>
      <td>${direction}</td>
    </tr>`;
  }).join("");

  return `
    <section class="profile flag-panel">
      <p class="eyebrow">⚠ 相邻字幕语速变化</p>
      <table class="benchmark"><thead><tr><th>区间</th><th>变化</th><th>方向</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="hint">相邻字幕的变化较大，建议回看这一段是否仍然清楚、自然。</p>
    </section>`;
}

function timeRange(rows, indexes) {
  const first = rows.find((row) => row.index === indexes[0]);
  const last = rows.find((row) => row.index === indexes[indexes.length - 1]);
  return first && last ? `${RA().formatTime(first.start)}–${RA().formatTime(last.end)}` : "—";
}

function actionItems(analysis, profile) {
  if (analysis.language === "mixed") return [];
  const isZh = analysis.language === "zh";
  const rateKey = isZh ? "cpm" : "wpm";
  const activeKey = isZh ? "cpmActive" : "wpmActive";
  const rateUnit = isZh ? "CPM" : "WPM";
  const issues = [];

  for (const overlap of analysis.overlaps || []) {
    issues.push({
      priority: 4,
      time: timeRange(analysis.rows, [overlap.first, overlap.second]),
      title: "字幕时间码重叠，建议优先复核",
      detail: `两条字幕重叠 ${overlap.duration}s。请先确认这是否为多人说话、双语叠加或时间码错误；不要仅凭这一信号自动修改文本。`,
    });
  }

  for (const jump of analysis.rateJumps) {
    issues.push({
      priority: 3,
      time: timeRange(analysis.rows, jump.between),
      title: "相邻字幕语速变化明显",
      detail: `语速${jump.direction === "sped up" ? "加快" : "放慢"} ${Math.abs(jump.delta)} ${rateUnit}。回看这两条字幕，优先尝试拆句或调整前一条的持续时间。`,
    });
  }

  const activeRange = profile.metrics?.[activeKey];
  if (activeRange) {
    analysis.rows
      .filter((row) => Number.isFinite(row[rateKey]) && row[rateKey] > activeRange.max)
      .sort((a, b) => b[rateKey] - a[rateKey])
      .slice(0, 2)
      .forEach((row) => issues.push({
        priority: 2,
        time: `${RA().formatTime(row.start)}–${RA().formatTime(row.end)}`,
        title: "单条字幕偏密",
        detail: `当前为 ${row[rateKey]} ${rateUnit}，高于此用途的参考上限 ${activeRange.max}。检查是否可拆句、延长持续时间或删减冗余词。`,
      }));
  }

  analysis.pauses
    .filter((pause) => pause.duration >= 3)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 1)
    .forEach((pause) => issues.push({
      priority: 1,
      time: timeRange(analysis.rows, [pause.after, pause.before]),
      title: "出现超长字幕间隔",
      detail: `间隔 ${pause.duration}s。结合画面确认它承担转场、强调或章节停顿；若没有明确作用，可缩短间隔。`,
    }));

  const unique = new Map();
  for (const issue of issues.sort((a, b) => b.priority - a.priority)) {
    const key = `${issue.time}:${issue.title}`;
    if (!unique.has(key)) unique.set(key, issue);
  }
  return [...unique.values()].slice(0, 3);
}

function iterationPrompt(item) {
  return `保持当前授权音色与内容含义不变。处理 ${item.time}：${item.detail} 输出可直接替换的该段旁白与对应字幕时间建议。`;
}

function iterationPackage(analysis, profile) {
  const items = actionItems(analysis, profile);
  return {
    format: "voxr.voice-iteration-package",
    version: 1,
    workflow: "voiceover-rhythm-iteration",
    generatedAt: new Date().toISOString(),
    purpose: { id: profileSelect.value, label: profile.label, status: profile.status },
    source: {
      srtFile: pendingSrtFile?.name || null,
      audioIncluded: Boolean(currentAudioAnalysis),
      audioFile: currentAudioAnalysis ? currentAudioFileName : null,
      audioAuthorizationConfirmed: Boolean(currentAudioAnalysis && audioConsent.checked),
    },
    inputBoundary: {
      timing: "SRT text and timestamps",
      audio: currentAudioAnalysis ? "Authorized local PCM sample measurements only" : "No audio measurement included",
      excluded: ["LUFS", "true peak", "pitch/F0", "emotion", "intelligibility", "voice similarity"],
    },
    profile: { id: profileSelect.value, label: profile.label, status: profile.status, profileVersion: profile.profileVersion, evidenceLevel: profile.evidenceLevel, lastCalibratedAt: profile.lastCalibratedAt },
    parser: currentParseReport ? { parsedCueCount: currentParseReport.parsedCueCount, skippedBlockCount: currentParseReport.skippedBlockCount, warnings: currentParseReport.warnings } : null,
    timeline: { firstCueOffset: analysis.rows[0]?.start ?? null, lastCueEnd: analysis.rows.at(-1)?.end ?? null, subtitleSpan: analysis.totals.timelineDuration, subtitleCoverageDuration: analysis.totals.subtitleCoverageDuration, subtitleGapRatio: analysis.totals.silenceRatio },
    measurements: {
      language: analysis.language,
      languageDetail: analysis.languageDetail,
      languageComposition: analysis.languageComposition,
      activeRate: analysis.language === "zh" ? analysis.totals.chineseCpmActive : analysis.language === "en" ? analysis.totals.englishWpmActive : null,
      timelineRate: analysis.language === "zh" ? analysis.totals.chineseCpmTimeline : analysis.language === "en" ? analysis.totals.englishWpmTimeline : null,
      rateUnit: analysis.language === "zh" ? "CPM" : analysis.language === "en" ? "WPM" : null,
      pauseCount: analysis.totals.pauseCount,
      pausePer100: analysis.totals.pausePer100,
      overlaps: analysis.overlaps,
    },
    priorities: items.map((item) => ({ priority: item.priority, timecode: item.time, issue: item.title, recommendation: item.detail, prompt: iterationPrompt(item) })),
    audioQC: currentAudioAnalysis ? {
      fileName: currentAudioFileName,
      duration: currentAudioAnalysis.duration,
      alignment: {
        firstCueOffset: analysis.rows[0]?.start ?? null,
        lastCueEnd: analysis.rows.at(-1)?.end ?? null,
        audioTailGap: analysis.rows.length ? Math.round((currentAudioAnalysis.duration - analysis.rows.at(-1).end) * 1000) / 1000 : null,
      },
      peakDbfs: currentAudioAnalysis.peakDbfs,
      rmsDbfs: currentAudioAnalysis.rmsDbfs,
      clippedSamples: currentAudioAnalysis.clippedSamples,
      note: "PCM sample measurements only; not LUFS, true peak, pitch, emotion, or voice similarity.",
    } : null,
  };
}

function renderActionPlan(analysis, profile) {
  const items = actionItems(analysis, profile);
  const language = analysis.language === "zh" ? (analysis.languageDetail === "zh-dominant" ? "中文为主" : "中文") : analysis.language === "en" ? (analysis.languageDetail === "en-dominant" ? "英文为主" : "英文") : "中英均衡混合";
  const english = locale === "en";
  const languageLabel = english ? (analysis.language === "zh" ? "Chinese" : analysis.language === "en" ? "English" : "mixed-language") : language;
  const summary = items.length
    ? (english ? `This ${languageLabel} SRT has ${items.length} suggested review moments. Check the timestamped clips first, then compare the overall metrics after editing.` : `这份 ${language} 字幕有 ${items.length} 处建议优先回看的时间点。先核对带时间点的片段，再回到整体指标比较修改前后。`)
    : (english ? `This ${languageLabel} SRT has no clear review signals. Check names, numbers, and transitions against the actual audio and picture.` : `这份 ${language} 字幕没有发现明显的优先回看点。建议仍结合实际音频和画面检查专有名词、数字与转场。`);
  const title = items.length ? (english ? `Review these ${items.length} clips first` : `本次建议优先复盘 ${items.length} 段`) : (english ? "No clear review signals this time" : "本次没有明显优先复盘信号");
  const kicker = english ? "START HERE" : "先处理这些片段";
  const boundary = english ? "Production reference" : "制作参考";
  $("#action-plan").innerHTML = `<div class="action-plan__header"><div><p class="eyebrow">${kicker}</p><h2>${title}</h2></div><span class="hint">${boundary}</span></div><p class="action-plan__summary">${summary}</p>${items.length ? `<ol class="action-list">${items.map((item) => `<li class="action-item"><span class="action-item__time">${item.time}</span><strong class="action-item__title">${item.title}</strong><span class="action-item__detail">${item.detail}</span>${currentAudioUrl ? `<button class="action-item__play" type="button" data-play-time="${item.time}">试听这段</button>` : ""}</li>`).join("")}</ol>` : ""}`;
  document.querySelectorAll("[data-play-time]").forEach((button) => button.addEventListener("click", () => playTimeRange(button.dataset.playTime)));
}

function playTimeRange(range) {
  const player = $("#audio-player");
  const [startText, endText] = range.split("–");
  const toSeconds = (time) => {
    const [minutes, seconds] = time.split(":").map(Number);
    return minutes * 60 + seconds;
  };
  if (!player || !startText || !endText) return;
  const start = toSeconds(startText);
  const end = toSeconds(endText);
  player.currentTime = start;
  const stopAtEnd = () => {
    if (player.currentTime >= end) {
      player.pause();
      player.removeEventListener("timeupdate", stopAtEnd);
    }
  };
  player.addEventListener("timeupdate", stopAtEnd);
  player.play();
}

function renderRhythmVisuals(analysis, profile) {
  const isZh = analysis.language === "zh";
  const rateKey = isZh ? "cpm" : "wpm";
  const rateUnit = isZh ? "CPM" : "WPM";
  const range = profile.metrics?.[isZh ? "cpmActive" : "wpmActive"];
  const rows = analysis.rows.filter((row) => Number.isFinite(row[rateKey]));
  const visual = $("#visual-report");
  if (!rows.length) {
    visual.replaceChildren();
    return;
  }

  const width = 860;
  const height = 250;
  const pad = { top: 26, right: 20, bottom: 34, left: 48 };
  const maxRate = Math.max(...rows.map((row) => row[rateKey]), range?.max || 0, 1);
  const minRate = Math.max(0, Math.min(...rows.map((row) => row[rateKey]), range?.min ?? maxRate) * 0.72);
  const scaleX = (seconds) => pad.left + ((seconds - analysis.rows[0].start) / Math.max(analysis.totals.timelineDuration, 1)) * (width - pad.left - pad.right);
  const scaleY = (rate) => pad.top + (1 - ((rate - minRate) / Math.max(maxRate - minRate, 1))) * (height - pad.top - pad.bottom);
  const points = rows.map((row) => `${scaleX((row.start + row.end) / 2).toFixed(1)},${scaleY(row[rateKey]).toFixed(1)}`).join(" ");
  const targetBand = range
    ? `<rect class="rhythm-chart__target" x="${pad.left}" y="${scaleY(range.max)}" width="${width - pad.left - pad.right}" height="${Math.max(1, scaleY(range.min) - scaleY(range.max))}" />`
    : "";
  const markers = rows.map((row) => {
    const status = range ? RA().compareRange(row[rateKey], range).status : "n/a";
    return `<circle class="rhythm-chart__point rhythm-chart__point--${status}" cx="${scaleX((row.start + row.end) / 2)}" cy="${scaleY(row[rateKey])}" r="4"><title>#${row.index} · ${RA().formatTime(row.start)}–${RA().formatTime(row.end)} · ${row[rateKey]} ${rateUnit}</title></circle>`;
  }).join("");
  const pauses = Object.entries(analysis.pauseTypes).map(([type, value]) => ({ type, ...value }));
  const maxPauseCount = Math.max(...pauses.map((pause) => pause.count), 1);
  const pauseBars = pauses.map((pause) => `<div class="pause-bar"><span>${pause.label}</span><div class="pause-bar__track"><i class="pause-bar__fill pause-${pause.type}" style="width:${(pause.count / maxPauseCount) * 100}%"></i></div><b>${pause.count} 次</b></div>`).join("") || `<p class="hint">这份字幕没有可统计的字幕间隔。</p>`;
  const caption = range
    ? `阴影区表示所选用途的制作参考区间。每个点对应一条字幕的字幕覆盖语速。`
    : `每个点对应一条字幕的字幕覆盖语速。访谈类用途不使用固定的制作参考区间。`;

  visual.innerHTML = `
    <section class="visual-card rhythm-chart">
      <div class="visual-card__header"><div><p class="eyebrow">RHYTHM TRACE</p><h2>节奏曲线</h2></div><span class="hint">${rateUnit} · 每条字幕</span></div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="字幕语速随时间变化的曲线图">
        <line class="rhythm-chart__axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" />
        <line class="rhythm-chart__axis" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" />
        ${targetBand}
        <polyline class="rhythm-chart__line" points="${points}" />
        ${markers}
        <text class="rhythm-chart__label" x="6" y="${pad.top + 5}">${Math.round(maxRate)}</text>
        <text class="rhythm-chart__label" x="6" y="${height - pad.bottom + 4}">${Math.round(minRate)}</text>
        <text class="rhythm-chart__label" x="${pad.left}" y="${height - 9}">${RA().formatTime(analysis.rows[0].start)}</text>
        <text class="rhythm-chart__label rhythm-chart__label--end" x="${width - pad.right}" y="${height - 9}">${RA().formatTime(analysis.rows[analysis.rows.length - 1].end)}</text>
      </svg>
      <p class="hint">${caption}</p>
    </section>
    <section class="visual-card">
      <div class="visual-card__header"><div><p class="eyebrow">PAUSE SHAPE</p><h2>留白结构</h2></div><span class="hint">按间隔时长分组</span></div>
      <div class="pause-bars">${pauseBars}</div>
      <p class="hint">它显示字幕时间轴中的留白分布，仍需结合画面和句意判断停顿是否合适。</p>
    </section>`;
}

function audioDb(value) {
  return Number.isFinite(value) ? `${value} dBFS` : "—";
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function renderAudioReport() {
  const report = $("#audio-report");
  if (!currentAudioAnalysis) {
    report.replaceChildren();
    return;
  }
  const audio = currentAudioAnalysis;
  const firstCueOffset = currentAnalysis?.rows[0]?.start ?? null;
  const lastCueEnd = currentAnalysis?.rows.at(-1)?.end ?? null;
  const audioTailGap = lastCueEnd == null ? null : Math.round((audio.duration - lastCueEnd) * 1000) / 1000;
  const bars = audio.waveform.map((point, index) => {
    const x = 8 + index * (304 / Math.max(audio.waveform.length - 1, 1));
    return `<line class="audio-waveform__bar" x1="${x}" y1="${80 - point.max * 70}" x2="${x}" y2="${80 - point.min * 70}" />`;
  }).join("");
  const eligibleSegments = audio.segments.filter((segment) => Number.isFinite(segment.rmsDbfs) && segment.end - segment.start >= 0.45);
  const medianRms = median(eligibleSegments.map((segment) => segment.rmsDbfs));
  const lowEnergy = medianRms == null ? [] : eligibleSegments.filter((segment) => segment.rmsDbfs <= medianRms - 6).sort((a, b) => a.rmsDbfs - b.rmsDbfs).slice(0, 3);
  const segmentNotes = currentAnalysis && lowEnergy.length
    ? `<ol class="audio-segments">${lowEnergy.map((segment) => `<li>#${segment.index} · ${RA().formatTime(segment.start)}–${RA().formatTime(segment.end)}：RMS ${audioDb(segment.rmsDbfs)}，低于同批合格片段中位数约 ${Math.round((medianRms - segment.rmsDbfs) * 10) / 10} dB。请结合实际听感复核。</li>`).join("")}</ol>`
    : `<p class="hint">没有片段低于同批合格片段的 RMS 中位数 6 dB；这不等于“没有听感问题”。</p>`;
  const alignment = lastCueEnd == null
    ? "<small>导入 SRT 后可显示起始空档和尾部余量。</small>"
    : `<small>首条字幕前 ${firstCueOffset}s；最后字幕结束后 ${audioTailGap}s。两者是不同的时间轴关系。</small>`;
  report.innerHTML = `<section class="audio-qc"><div class="audio-qc__header"><div><p class="eyebrow">AUDIO QC LITE</p><h2>本地音频检查</h2></div><span class="hint">${RA().escapeHtml(currentAudioFileName || "音频")}</span></div><audio id="audio-player" controls preload="metadata" src="${currentAudioUrl}">当前浏览器不支持音频播放。</audio><div class="grid"><article class="metric"><span>音频时长</span><strong>${audio.duration}s</strong><small>${audio.sampleRate} Hz</small></article><article class="metric"><span>样本峰值</span><strong>${audioDb(audio.peakDbfs)}</strong><small>${audio.clippedSamples ? `检测到 ${audio.clippedSamples} 个接近满刻度样本` : "未发现接近满刻度样本"}</small></article><article class="metric"><span>整体 RMS</span><strong>${audioDb(audio.rmsDbfs)}</strong><small>描述 PCM 平均能量，不是 LUFS</small></article><article class="metric"><span>SRT 对齐线索</span><strong>${lastCueEnd == null ? "待匹配" : `${audioTailGap >= 0 ? "+" : ""}${audioTailGap}s`}</strong>${alignment}</article></div><svg class="audio-waveform" viewBox="0 0 320 160" role="img" aria-label="音频波形概览"><line class="audio-waveform__baseline" x1="0" y1="80" x2="320" y2="80" />${bars}</svg><p class="hint">波形、峰值与 RMS 基于本地解码的 PCM 样本。它不测量 LUFS、True Peak、音高、情绪或音色相似度。</p>${segmentNotes}</section>`;
}

function render(analysis, filename) {
  currentAnalysis = analysis;
  const t = analysis.totals;
  const isZh = analysis.language === "zh";
  const profile = window.RHYTHM_PROFILES[profileSelect.value];
  const hasMetrics = profile.metrics && Object.keys(profile.metrics).length > 0;

  // Determine status flags for key metrics
  const activeValue = isZh ? t.chineseCpmActive : t.englishWpmActive;
  const timelineValue = isZh ? t.chineseCpmTimeline : t.englishWpmTimeline;
  const activeRange = hasMetrics ? (isZh ? profile.metrics.cpmActive : profile.metrics.wpmActive) : null;
  const timelineRange = hasMetrics ? (isZh ? profile.metrics.cpmTimeline : profile.metrics.wpmTimeline) : null;
  const activeStatus = activeRange ? RA().compareRange(activeValue, activeRange).status : "";
  const timelineStatus = timelineRange ? RA().compareRange(timelineValue, timelineRange).status : "";

  $("#empty").hidden = true;
  $("#report").hidden = false;
  $("#filename").textContent = filename;
  $("#profile-guidance").innerHTML = profilePanel();
  renderActionPlan(analysis, profile);
  renderRhythmVisuals(analysis, profile);
  if (currentAudioPcm) currentAudioAnalysis = window.LocalAudioQC.analyzePcm(currentAudioPcm, currentAudioSampleRate, analysis.rows);
  renderAudioReport();

  $("#metrics").innerHTML = [
    metric("字幕语言", isZh ? "中文" : analysis.language === "en" ? "英文" : "中英混合"),
    metric("解析完整性", currentParseReport ? `${currentParseReport.parsedCueCount}/${currentParseReport.totalBlockCount} 区块` : "—", currentParseReport?.skippedBlockCount ? `${currentParseReport.skippedBlockCount} 个区块已跳过` : "未发现跳过区块"),
    metric("字幕覆盖时长", `${t.subtitleCoverageDuration}s`, `${t.englishWords} 英文词 · ${t.chineseCharacters} 汉字`),
    metric("完整时间线", `${t.timelineDuration}s`, `${t.totalPauseDuration}s 字幕覆盖外时间 (${t.silenceRatio}%)`),
    metric("字幕覆盖语速", formatRate(analysis), `标准差 ${analysis.variation.primaryRateStdDev ?? "—"}`, activeStatus),
    metric("时间线语速", formatRate(analysis, false), "包含字幕之间的留白", timelineStatus),
    metric("语速波动", `${analysis.variation.primaryRateStdDev ?? "—"}`, analysis.language === "mixed" ? "中英混合不计算单一波动值" : `范围 ${analysis.variation.slowest ?? "—"}–${analysis.variation.fastest ?? "—"}`),
    metric("平均间隔", `${t.avgPauseDuration}s`, `共 ${t.pauseCount} 个字幕间隔`),
    metric("间隔频率", t.pausePer100 == null ? "—" : `${t.pausePer100}`, t.pausePer100 == null ? "中英混合不计算单一频率" : `/100${isZh ? "字" : "词"}`),
  ].join("");

  // Panels
  const parseWarning = currentParseReport?.skippedBlockCount
    ? `<section class="profile-panel"><p class="eyebrow">PARSING NOTICE</p><h2>字幕文件有 ${currentParseReport.skippedBlockCount} 个区块未纳入分析</h2><p>导出会保留解析警告；将结果接入自动化工作流前，请先修复源 SRT，避免把部分分析当作完整结论。</p></section>`
    : "";
  let panelsHtml = parseWarning + benchmarkPanel(analysis) + pauseTypesPanel(analysis);
  if (analysis.rateJumps.length) panelsHtml += rateJumpsPanel(analysis);
  $("#panels").innerHTML = panelsHtml;

  // Pause list with type labels
  $("#pause-list").innerHTML = analysis.pauses.length
    ? analysis.pauses.map((pause) => {
        const chip = `<span class="chip pause-${pause.type}">${pause.typeEnLabel}</span>`;
        return `<li>${chip} 第 ${pause.after} 条与第 ${pause.before} 条之间：<b>${pause.duration}s</b></li>`;
      }).join("")
    : "<li>未发现字幕之间的间隔。</li>";

  // Row table with rate status
  $("#rows").innerHTML = analysis.rows.map((row) => {
    const rate = isZh ? `${row.cpm ?? "—"} CPM` : `${row.wpm ?? "—"} WPM`;
    return `<tr><td>${row.index}</td><td>${RA().formatTime(row.start)}–${RA().formatTime(row.end)}</td><td>${row.duration}s</td><td>${rate}</td><td>${RA().escapeHtml(row.text)}</td></tr>`;
  }).join("");
}

function queueSrtFile(file) {
  if (!profileSelect.value) {
    $("#error").textContent = "请先选择配音用途。它会决定语速与留白的制作参考。";
    $("#error").hidden = false;
    return;
  }
  pendingSrtFile = file;
  currentParseReport = null;
  analysisIsCurrent = false;
  $("#export").disabled = true;
  updateReadyState();
}

function queueAudioFile(file) {
  if (!profileSelect.value) {
    $("#error").textContent = "请先选择配音用途。它会决定后续报告如何解释音频与字幕。";
    $("#error").hidden = false;
    return;
  }
  pendingAudioFile = file;
  currentAudioAnalysis = null;
  currentAudioPcm = null;
  currentAudioSampleRate = null;
  currentAudioFileName = null;
  analysisIsCurrent = false;
  $("#export").disabled = true;
  if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
  currentAudioUrl = URL.createObjectURL(file);
  $("#audio-report").replaceChildren();
  updateReadyState();
}

async function startAnalysis() {
  if (!profileSelect.value) {
    $("#error").textContent = "请先选择配音用途。";
    $("#error").hidden = false;
    return;
  }
  if (!pendingSrtFile) return;
  if (pendingAudioFile && !audioConsent.checked) {
    $("#error").textContent = "音频已选中，请先确认分析授权，或清空音频后仅分析 SRT。";
    $("#error").hidden = false;
    return;
  }
  try {
    currentParseReport = RA().parseSrtDetailed(await pendingSrtFile.text());
    render(RA().analyze(currentParseReport.cues), pendingSrtFile.name);
    if (pendingAudioFile) await analyzeAudioFile(pendingAudioFile);
    analysisIsCurrent = true;
    $("#export").disabled = false;
    $("#error").hidden = true;
  } catch (error) {
    $("#error").textContent = error.message;
    $("#error").hidden = false;
  }
}

async function analyzeAudioFile(file) {
  if (!audioConsent.checked) {
    $("#error").textContent = "请先确认你拥有该音频及所涉声音的分析授权。";
    $("#error").hidden = false;
    return;
  }
  if (file.size > 150 * 1024 * 1024) {
    $("#error").textContent = "首版仅建议分析 150 MB 以内的音频文件，以避免浏览器内存压力。";
    $("#error").hidden = false;
    return;
  }
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error("当前浏览器不支持本地音频解码。");
    const context = new Context();
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    if (decoded.duration > 600) throw new Error("首版本地音频检查仅支持 10 分钟以内的文件。");
    const mixed = new Float32Array(decoded.length);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const data = decoded.getChannelData(channel);
      for (let index = 0; index < data.length; index++) mixed[index] += data[index] / decoded.numberOfChannels;
    }
    currentAudioPcm = mixed;
    currentAudioSampleRate = decoded.sampleRate;
    currentAudioAnalysis = window.LocalAudioQC.analyzePcm(mixed, decoded.sampleRate, currentAnalysis?.rows || []);
    currentAudioFileName = file.name;
    renderAudioReport();
    if (currentAnalysis) renderActionPlan(currentAnalysis, window.RHYTHM_PROFILES[profileSelect.value]);
    $("#error").hidden = true;
    await context.close();
  } catch (error) {
    $("#error").textContent = `无法在当前浏览器解码此音频：${error.message}`;
    $("#error").hidden = false;
  }
}

function exportJson() {
  if (!currentAnalysis || !analysisIsCurrent) return;
  const profile = window.RHYTHM_PROFILES[profileSelect.value];
  const payload = iterationPackage(currentAnalysis, profile);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: "voice-iteration-package.json" });
  anchor.click();
  URL.revokeObjectURL(url);
}

renderProfiles();
updateReadyState();
document.querySelectorAll("[data-locale]").forEach((button) => button.addEventListener("click", () => setLocale(button.dataset.locale)));
function requirePurposeBeforePicker(event) {
  if (profileSelect.value) return;
  event.preventDefault();
  $("#error").textContent = "请先选择配音用途，再选择文件。";
  $("#error").hidden = false;
  profileSelect.focus();
}
fileInput.addEventListener("click", requirePurposeBeforePicker);
audioInput.addEventListener("click", requirePurposeBeforePicker);
fileInput.addEventListener("change", (event) => event.target.files[0] && queueSrtFile(event.target.files[0]));
audioInput.addEventListener("change", (event) => event.target.files[0] && queueAudioFile(event.target.files[0]));
audioConsent.addEventListener("change", updateReadyState);
profileSelect.addEventListener("change", () => {
  $("#error").hidden = true;
  updateReadyState();
  if (currentAnalysis) render(currentAnalysis, $("#filename").textContent);
});
$("#export").addEventListener("click", exportJson);
$("#analyze").addEventListener("click", startAnalysis);
recorderPlay.addEventListener("click", async () => {
  if (!currentAudioUrl) return;
  if (deskAudioPlayer.paused) {
    try {
      await deskAudioPlayer.play();
    } catch (error) {
      $("#error").textContent = `无法开始试听：${error.message}`;
      $("#error").hidden = false;
    }
  } else {
    deskAudioPlayer.pause();
  }
});
deskAudioPlayer.addEventListener("play", () => {
  recorderConsole.classList.add("is-playing");
  $("#recorder-status").textContent = "PLAYBACK IN PROGRESS";
  $("#recorder-play-label").textContent = UI_COPY[locale].recorderPause;
});
deskAudioPlayer.addEventListener("pause", () => {
  recorderConsole.classList.remove("is-playing");
  updateRecorderState();
});
deskAudioPlayer.addEventListener("ended", () => {
  recorderConsole.classList.remove("is-playing");
  updateRecorderState();
});
$("#reset").addEventListener("click", () => {
  pendingSrtFile = null;
  pendingAudioFile = null;
  currentAnalysis = null;
  currentAudioAnalysis = null;
  currentAudioPcm = null;
  currentAudioSampleRate = null;
  currentAudioFileName = null;
  currentParseReport = null;
  analysisIsCurrent = false;
  if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
  currentAudioUrl = null;
  fileInput.value = "";
  audioInput.value = "";
  audioConsent.checked = false;
  $("#report").hidden = true;
  $("#empty").hidden = false;
  $("#audio-report").replaceChildren();
  $("#export").disabled = true;
  $("#error").hidden = true;
  updateReadyState();
});
function wireDropZone(zone, handler) {
  ["dragenter", "dragover"].forEach((eventName) => zone.addEventListener(eventName, (event) => {
    event.preventDefault(); zone.classList.add("dragging");
  }));
  ["dragleave", "drop"].forEach((eventName) => zone.addEventListener(eventName, (event) => {
    event.preventDefault(); zone.classList.remove("dragging");
  }));
  zone.addEventListener("drop", (event) => event.dataTransfer.files[0] && handler(event.dataTransfer.files[0]));
}
wireDropZone(dropZone, queueSrtFile);
wireDropZone(audioDropZone, queueAudioFile);
