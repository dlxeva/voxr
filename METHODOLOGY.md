# Voxr 方法、参考与边界 / Methodology, references, and boundaries

> **定位 / Positioning**：Voxr 是面向授权 AI 合成旁白的本地节奏复盘工具，不是广播级音频认证或自动化配音评分器。
> Voxr is a local pacing-review tool for authorized AI-synthesized voiceover. It is not a broadcast-certification suite or an automatic voiceover grader.

## 1. 我们实际测量什么 / What we actually measure

Voxr 读取 SRT 的文本和时间轴，计算字幕覆盖时长、完整时间线时长、相邻字幕的间隔、中文字符数与英文词数；据此显示 CPM、WPM、字幕覆盖外时间占比、间隔频率和相邻片段的语速变化。

Voxr reads SRT text and timestamps. It calculates subtitle coverage, full timeline duration, adjacent-cue gaps, Chinese-character count, and English-word count. From those inputs it displays CPM, WPM, time outside subtitle coverage, gap frequency, and rate changes between neighboring cues.

“字幕覆盖时长”和“字幕覆盖外时间”仅描述字幕时间轴，不能直接称为真实开口时长或静音时长。SRT 不是逐音素对齐数据。

“Subtitle coverage” and “time outside coverage” describe the subtitle timeline only. They are not claims about actual voiced duration or silence; an SRT is not phoneme-level alignment data.

## 2. Audio QC Lite / Audio QC Lite

在用户确认拥有授权后，浏览器会在本地把音频解码为 PCM 样本，并显示波形、样本峰值、RMS 平均能量、接近满刻度样本数量、首条字幕前的时间、最后字幕结束后的音频余量，以及可供回听的相对低能量字幕区间。文件不会上传、保存或发送到服务端。

After the user confirms authorization, the browser decodes the audio locally into PCM samples. It shows waveform data, sample peak, RMS average energy, near-full-scale samples, time before the first subtitle, audio remaining after the final subtitle, and relatively low-energy cues for replay. Files are not uploaded, stored, or sent to a service.

“相对低能量”只会在长度不少于 0.45 秒、且 RMS 比同批合格字幕区间中位数低至少 6 dB 时提示。它是回听线索，不是“音量不合格”“情绪不足”或静音判断。

“Relative low energy” is shown only for cues at least 0.45 seconds long and at least 6 dB below the median RMS of eligible cues in the same file. It is a replay cue, not a loudness failure, an emotion judgment, or a silence detector.

这些指标**不等同于** LUFS、True Peak、音高/F0、情绪、可懂度、音色相似度或版权/授权判断。当前版本没有实现 EBU R128 所需的加权、门限和校验流程，因此不会报告 LUFS。

These metrics are **not** LUFS, true peak, pitch/F0, emotion, intelligibility, voice similarity, or a copyright/consent determination. The current version does not implement the weighting, gating, and validation required by EBU R128, so it does not report LUFS.

## 3. 场景预设如何得出 / How delivery presets are used

`profiles.js` 中的纪录片、解释型视频、产品视频、短视频、儿童内容、访谈等区间，来自当前团队的制作复盘规则。它们的作用是提示“值得回听、重写或重配的片段”，而不是给一段旁白盖上合格/不合格的结论。时间线语速会由有效语速和字幕覆盖外时间占比推导，以避免多组目标互相矛盾。

The documentary, explainer, product-video, short-form, children’s-content, interview, and other ranges in `profiles.js` are current team production-review rules. Their purpose is to flag clips worth replaying, rewriting, or regenerating—not to certify a voiceover as pass/fail. Timeline-rate ranges are derived from active rate and time outside subtitle coverage so that the targets remain internally consistent.

同一数字可以在不同脚本、语言、说话风格、音乐和画面节奏下产生完全不同的感受。因此最可靠的用法是：为同一用途比较多个生成版本，再结合实际音频和画面做人工判断。

The same number can feel very different across scripts, languages, speaking styles, music, and visuals. The most reliable use is to compare several generated versions for the same delivery purpose, then make a human judgment with the actual audio and picture.

## 4. 间隔分类 / Gap categories

工具按相邻字幕的时间差分组：少于 0.20 秒为极短；[0.20, 0.50) 秒为短；[0.50, 1.00) 秒为中；[1.00, 3.00) 秒为长；3 秒及以上为超长。每个正间隔只属于一个区间。

The tool groups the time difference between adjacent cues as: under 0.20 s = very short; 0.20–0.49 s = short; 0.50–0.99 s = medium; 1.00–2.99 s = long; 3 s or more = extra long.

同一个间隔可能服务于换气、语法、理解、情绪或转场。分类只描述时间长度，不解释其意图或质量。

The same gap may serve breath, grammar, comprehension, emotion, or a visual transition. The category describes duration only; it does not infer intent or quality.

## 5. 方法来源与可核查参考 / Design lineage and checkable references

Voxr 的框架借鉴了字幕时间轴质检的常见做法：用每段时长、阅读/说话速率、相邻间隔和重叠来定位值得复查的时间码；随后把它转成合成旁白工作流所需的“重配动作 + 通用提示词/JSON”。这是独立实现，不使用或复制任何第三方网页工具的代码。

Voxr is informed by common subtitle-timeline QC practice: use cue duration, reading/speaking rate, adjacent gaps, and overlaps to locate timecodes worth review; then translate them into “regeneration actions + generic prompts/JSON” for a synthesized-voice workflow. This is an independent implementation and does not use or copy code from any third-party web tool.

下列研究支持“语速、上下文和留白会影响语音感知或可懂度”这一测量方向。它们**不直接推出** Voxr 的任何 CPM、WPM 或间隔参考区间；对外引用具体区间时，应称其为 Voxr 的制作参考。

The studies below support the measurement direction—that rate, context, and pauses can affect speech perception or intelligibility. They **do not directly derive** any Voxr CPM, WPM, or gap range. When communicating a specific range publicly, call it a Voxr production reference.

1. Yuan, J. & Church, K. (2021). *Speaking Rate and Tonal Realization in Mandarin Chinese: What Can We Learn From Large Speech Corpora?* ICASSP 2021, pp. 6463–6467. [Conference record and abstract](https://www2.securecms.com/ICASSP2021/Papers/ViewPaper_MS.asp?PaperNum=4465). Chinese rate and prosody should be observed in the relevant corpus and context.
2. Pitt, M. A., Szostak, C. & Dilley, L. C. (2016). *Rate dependent speech processing can be speech specific: Evidence from the perceptual disappearance of words under changes in context speech rate.* *Psychonomic Bulletin & Review*, 23, 334–345. [PubMed](https://pubmed.ncbi.nlm.nih.gov/26392395/) · [DOI](https://doi.org/10.3758/s13414-015-0981-7). Contextual rate changes can be a useful replay signal.
3. Lai, W. & Dilley, L. (2016). *Cross-linguistic generalization of the distal rate effect: Speech rate in context affects whether listeners hear a function word in Chinese Mandarin.* Speech Prosody 2016. [Open paper PDF](https://www.isca-archive.org/speechprosody_2016/lai16b_speechprosody.pdf). Contextual rate can affect word perception in Mandarin.
4. Breznitz, Z. (1990). *Vocalization and pauses in fast-paced reading.* *The Journal of General Psychology*, 117(2), 153–159. [PubMed](https://pubmed.ncbi.nlm.nih.gov/2366048/) · [DOI](https://doi.org/10.1080/00221309.1990.9921132). The study measures voiced time, pause time, and pause frequency under faster reading.
5. Mahr, T. J., Rathouz, P. J. & Hustad, K. C. (2024). *Speech Development Between 30 and 119 Months in Typical Children III: Interaction Between Speaking Rate and Intelligibility.* [PubMed](https://pubmed.ncbi.nlm.nih.gov/39680790/). The large-sample study reports a speed–accuracy trade-off relevant to keeping children’s-content references conservative.

## 6. 已知限制 / Known limitations

- SRT 的显示时间和文本可能压缩、分行或省略真实说话内容。/ SRT timing and text can compress, line-break, or omit what was actually spoken.
- 重叠字幕按覆盖区间合并计算；Voxr 无法判断它来自多人同时说话、双语字幕还是时间码错误。/ Overlapping cues are unioned for coverage; Voxr cannot tell whether an overlap represents concurrent speakers, bilingual subtitles, or a timestamp error.
- 中文按汉字计数，英文按词计数；含少量英文产品名的中文/英文脚本会按主导语言显示相应制作参考，只有中英占比接近的内容才不输出单一的间隔频率、波动值或场景判断。/ Chinese is counted by characters and English by words. A Chinese or English dominant script with a few product names uses its dominant-language reference; only balanced mixed-language content receives no single gap-frequency, variation, or preset judgment.
- SRT 解析会保留被跳过区块的数量、原始 cue ID 和原因。带有解析警告的导出不应被下游自动化当作“完整源文件”。/ SRT parsing preserves skipped-block count, source cue ID, and reason. A package with parsing warnings must not be treated as a complete source by downstream automation.
- 文本极少或极短的字幕会产生不稳定的瞬时速率，因此不参与相邻语速变化提示。/ Very short or text-sparse cues have unstable instantaneous rates and are excluded from neighboring-rate-change flags.
- 工具只在本地浏览器运行；当前没有同步、协作或云端保存。/ The tool runs only in the local browser; it currently has no sync, collaboration, or cloud storage.
