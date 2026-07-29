/**
 * Rhythm Lab profiles — public beta
 * These ranges are editable production-review references for this tool.
 * They are production-review references only and carry no normative force.
 */
window.RHYTHM_PROFILES = {
  // ── Chinese ──────────────────────────────────────────────
  "zh-documentary": {
    label: "中文 · 纪录片 / 深度叙事",
    status: "制作参考",
    summary: "沉浸式旁白。信息密度低、情绪空间大、留白即叙事。",
    metrics: {
      cpmActive:    { min: 180, max: 220, unit: "CPM" },
      silenceRatio: { min: 25,  max: 30, unit: "%" },
      pausePer100:  { min: 6,   max: 10, unit: "/100字" },
    },
    reviewCues: [
      "核心句前后可回看 0.5 至 1.0 秒的留白是否服务画面",
      "概念定义后检查 0.4 至 0.8 秒的留白是否便于理解",
      "全局 CPM 不应超过 180（timeline rate）",
      "语速变化应平滑过渡，避免相邻字幕 CPM 差 >40",
    ],
  },
  "zh-explainer": {
    label: "中文 · 解释型视频",
    status: "制作参考",
    summary: "知识密度中高，节奏均匀，视觉和语音配合推进。",
    metrics: {
      cpmActive:    { min: 200, max: 240, unit: "CPM" },
      silenceRatio: { min: 15,  max: 20, unit: "%" },
      pausePer100:  { min: 5,   max: 8,  unit: "/100字" },
    },
    reviewCues: [
      "复杂概念后检查 0.4 至 0.6 秒的留白",
      "操作步骤之间可试用 0.3 至 0.5 秒的字幕间隔",
      "Active CPM 超过 240 时考虑拆句",
      "Timeline CPM 不应低于 170（会拖）",
    ],
  },
  "zh-product": {
    label: "中文 · 产品发布 / 品牌片",
    status: "制作参考",
    summary: "节奏紧凑有能量，关键 claim 前留呼吸空间。",
    metrics: {
      cpmActive:    { min: 220, max: 260, unit: "CPM" },
      silenceRatio: { min: 10,  max: 15, unit: "%" },
      pausePer100:  { min: 4,   max: 7,  unit: "/100字" },
    },
    reviewCues: [
      "产品 claim 前留 0.3—0.5s 停顿",
      "操作步骤可快，但 claim 不可含糊",
      "Active CPM 超过 260 标记为过密",
      "连续 3 步操作无停顿标记为信息过载",
    ],
  },
  "zh-shortform": {
    label: "中文 · 短视频 / 口播",
    status: "制作参考",
    summary: "信息流竞争，前 3 秒必须抓住注意力。允许高语速但不可糊。",
    metrics: {
      cpmActive:    { min: 260, max: 320, unit: "CPM" },
      silenceRatio: { min: 5,   max: 12, unit: "%" },
      pausePer100:  { min: 3,   max: 6,  unit: "/100字" },
    },
    reviewCues: [
      "Hook 段允许 CPM 冲到 300+",
      "正文回落到 250—280",
      "结尾 CTA 可再次加速",
      "Active CPM 超过 320 标记为可能糊",
    ],
  },
  "zh-children": {
    label: "中文 · 儿童内容",
    status: "制作参考",
    summary: "减速、放大停顿、每个词留消化空间。",
    metrics: {
      cpmActive:    { min: 140, max: 180, unit: "CPM" },
      silenceRatio: { min: 25,  max: 35, unit: "%" },
      pausePer100:  { min: 8,   max: 14, unit: "/100字" },
    },
    reviewCues: [
      "每句之间留 0.6—1.0s",
      "新词或难词后检查约 0.8 秒的留白是否足够",
      "Timeline CPM 不应超过 160",
      "保持语调上扬和温暖感",
    ],
  },

  // ── English ──────────────────────────────────────────────
  "en-documentary": {
    label: "英文 · 纪录片 / 深度叙事",
    status: "制作参考",
    summary: "节奏从容，为画面保留空间。",
    metrics: {
      wpmActive:    { min: 145, max: 165, unit: "WPM" },
      silenceRatio: { min: 20,  max: 30, unit: "%" },
      pausePer100:  { min: 8,   max: 14, unit: "/100w" },
    },
    reviewCues: [
      "核心句前后检查 0.5 至 1.0 秒的留白",
      "画面停留时检查是否需要减少旁白",
      "时间线 WPM 高于 150 时建议回看",
      "相邻字幕 WPM 相差超过 30 时建议回看",
    ],
  },
  "en-explainer": {
    label: "英文 · 解释型视频 / 教程",
    status: "制作参考",
    summary: "清楚、均匀的讲解节奏。",
    metrics: {
      wpmActive:    { min: 160, max: 180, unit: "WPM" },
      silenceRatio: { min: 15,  max: 20, unit: "%" },
      pausePer100:  { min: 7,   max: 12, unit: "/100w" },
    },
    reviewCues: [
      "步骤之间可试用 0.3 至 0.5 秒的字幕间隔",
      "检查 WPM 的连续变化是否平稳",
      "连续三条以上没有间隔时建议回看信息密度",
      "低于 140 或高于 175 WPM 时建议结合实际画面回看",
    ],
  },
  "en-product": {
    label: "英文 · 产品发布 / 品牌片",
    status: "制作参考",
    summary: "紧凑有能量，关键表达保留落点。",
    metrics: {
      wpmActive:    { min: 165, max: 190, unit: "WPM" },
      silenceRatio: { min: 10,  max: 15, unit: "%" },
      pausePer100:  { min: 5,   max: 9,  unit: "/100w" },
    },
    reviewCues: [
      "产品表达前检查 0.3 至 0.5 秒的留白",
      "操作步骤可紧凑，同时检查每一步是否清楚",
      "有效语音超过 190 WPM 时建议检查是否需要拆句",
      "连续三步操作没有间隔时建议回看",
    ],
  },
  "en-shortform": {
    label: "英文 · 短视频 / 广告",
    status: "制作参考",
    summary: "高能量短内容，画面承担部分上下文。",
    metrics: {
      wpmActive:    { min: 180, max: 220, unit: "WPM" },
      silenceRatio: { min: 5,   max: 12, unit: "%" },
      pausePer100:  { min: 3,   max: 8,  unit: "/100w" },
    },
    reviewCues: [
      "开头可以较快，随后检查正文是否可听清",
      "结尾行动引导可再加快",
      "有效语音超过 220 WPM 时建议检查可听性",
      "留白比例低于 5% 时建议检查是否过密",
    ],
  },
  "en-children": {
    label: "英文 · 儿童内容",
    status: "制作参考",
    summary: "放慢节奏，保留充足的理解时间。",
    metrics: {
      wpmActive:    { min: 110, max: 140, unit: "WPM" },
      silenceRatio: { min: 25,  max: 35, unit: "%" },
      pausePer100:  { min: 10,  max: 16, unit: "/100w" },
    },
    reviewCues: [
      "句子之间可检查 0.6 至 1.0 秒的留白",
      "新词后检查约 0.8 秒的留白是否足够",
      "时间线 WPM 高于 120 时建议回看",
      "结合实际音频检查语调是否温暖、清晰",
    ],
  },

  // ── General-use presets ─────────────────────────────────
  "general-course": {
    label: "通用 · 课程 / 教学讲解",
    status: "制作参考",
    summary: "概念和步骤需要留出复看空间，优先保持清楚、稳定。",
    metrics: {
      cpmActive: { min: 180, max: 230, unit: "CPM" }, cpmTimeline: { min: 160, max: 200, unit: "CPM" },
      wpmActive: { min: 145, max: 175, unit: "WPM" }, wpmTimeline: { min: 130, max: 160, unit: "WPM" },
      silenceRatio: { min: 15, max: 25, unit: "%" }, pausePer100: { min: 5, max: 10, unit: "/100" },
    },
    reviewCues: ["定义、公式或操作步骤后检查留白", "相邻语速变化较大时回看是否仍然清楚", "将复杂步骤拆成可单独理解的短段"],
  },
  "general-news": {
    label: "通用 · 新闻 / 资讯播报",
    status: "制作参考",
    summary: "信息密度较高，重视专有名词、数字和句子边界的可听性。",
    metrics: {
      cpmActive: { min: 220, max: 270, unit: "CPM" }, cpmTimeline: { min: 195, max: 240, unit: "CPM" },
      wpmActive: { min: 160, max: 195, unit: "WPM" }, wpmTimeline: { min: 145, max: 180, unit: "WPM" },
      silenceRatio: { min: 8, max: 18, unit: "%" }, pausePer100: { min: 4, max: 8, unit: "/100" },
    },
    reviewCues: ["数字、名称和转折句前后检查是否有清楚的边界", "连续信息密集段落建议结合实际音频回听", "避免相邻字幕的语速突然跳变"],
  },
  "general-podcast": {
    label: "通用 · 播客 / 访谈整理",
    status: "语境优先",
    summary: "保留自然停顿和思考节奏，优先识别影响可听性的片段。",
    metrics: {
      cpmActive: { min: 170, max: 230, unit: "CPM" }, cpmTimeline: { min: 140, max: 200, unit: "CPM" },
      wpmActive: { min: 130, max: 175, unit: "WPM" }, wpmTimeline: { min: 115, max: 155, unit: "WPM" },
      silenceRatio: { min: 15, max: 30, unit: "%" }, pausePer100: { min: 5, max: 12, unit: "/100" },
    },
    reviewCues: ["长间隔需要结合说话内容判断", "保留有意义的犹豫和呼吸", "专注检查重叠、断句和难以听清的片段"],
  },

  // ── Conversation / Interview (no strict metrics) ─────────
  "interview": {
    label: "访谈 / 对话",
    status: "语境优先",
    summary: "自然犹豫也是对话的一部分，优先检查可读性。",
    metrics: {},
    reviewCues: [
      "自发对话需要结合说话方式阅读，避免直接套用旁白区间",
      "长间隔需要结合上下文检查是否承载强调或思考",
      "优先寻找影响可读性的片段",
      "语气词需要结合上下文判断是否影响理解",
    ],
  },
};

// Timeline-rate references are derived from the active-rate and subtitle-gap
// references. Keeping all three values independently editable creates
// contradictory targets: timeline rate = active rate × (1 - gap share).
for (const profile of Object.values(window.RHYTHM_PROFILES)) {
  profile.profileVersion = "0.2.0";
  profile.evidenceLevel = "heuristic-production-reference";
  profile.lastCalibratedAt = null;
  const silence = profile.metrics.silenceRatio;
  if (!silence) continue;
  for (const [activeKey, timelineKey] of [["cpmActive", "cpmTimeline"], ["wpmActive", "wpmTimeline"]]) {
    const active = profile.metrics[activeKey];
    if (!active) continue;
    profile.metrics[timelineKey] = {
      min: Math.round(active.min * (1 - silence.max / 100)),
      max: Math.round(active.max * (1 - silence.min / 100)),
      unit: active.unit,
      derived: true,
    };
  }
}
