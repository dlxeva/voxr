# Voxr

**Local rhythm QC for AI voiceover delivery.**
**面向 AI 合成旁白交付的本地节奏质检工具。**

[中文 README](README.zh-CN.md) · [Methodology / 方法、参考与边界](METHODOLOGY.md) · [Agent Skill](skills/voxr-rhythm-review) · [Iteration package schema](schemas/voxr.voice-iteration-package.schema.json)

Voxr is a browser-only tool for reviewing an SRT timeline and, optionally, an authorized voiceover file. It helps AI-video creators inspect timing, find clips worth replaying, and hand a concrete regeneration brief to the next TTS or editing step.

Voxr 是一个纯浏览器本地工具：它读取 SRT 时间轴，并可选读取一份已获授权的旁白音频，帮助 AI 视频创作者检查节奏、定位值得回听的片段，并把明确的重配要求交给下一步 TTS 或剪辑流程。

## What it does / 它做什么

- Parses `.srt` locally and reports subtitle coverage, timeline duration, gaps, Chinese CPM, English WPM, and rate changes.
- 本地解析 `.srt`，报告字幕覆盖、时间线时长、间隔、中文 CPM、英文 WPM 和相邻片段语速变化。
- Offers delivery-purpose presets such as explainers, documentaries, product videos, short-form clips, and children’s content.
- 提供解释型视频、纪录片、产品视频、短视频、儿童内容等配音用途预设。
- Lets an authorized user import audio for **Audio QC Lite**: waveform, sample peak, RMS energy, near-full-scale samples, first-cue/tail timing cues, and low-energy cue review.
- 用户确认拥有授权后，可导入音频使用 **Audio QC Lite**：查看波形、样本峰值、RMS 能量、接近满刻度样本、首条/尾部时间线索和低能量字幕区间。
- Produces a timestamped action list and an exportable `voice-iteration-package.json` for a human or an AI agent.
- 输出带时间码的行动清单和可导出的 `voice-iteration-package.json`，可交给人或 AI Agent 继续处理。

## What it does not do / 它不做什么

Voxr is a timing and lightweight signal-review aid, not a professional broadcast measurement suite. It does **not** measure LUFS, true peak, pitch/F0, emotion, intelligibility, phoneme alignment, speaker similarity, or copyright/voice consent.

Voxr 是节奏与轻量信号复盘工具，不是专业广播测量套件。它**不会**测量 LUFS、True Peak、音高/F0、情绪、可懂度、音素对齐、音色相似度，也不会判断版权或声音授权。

See [Methodology / 方法、参考与边界](METHODOLOGY.md) before relying on a result.

在依据任何结果采取行动前，请阅读[方法、参考与边界](METHODOLOGY.md)。

## Quick start / 快速开始

No build, account, upload, or server is required. Use a local HTTP server instead of opening files directly, so browser audio decoding behaves consistently.

无需构建、账号、上传或服务端。建议使用本地 HTTP 服务启动，而不要直接双击打开文件，以保证浏览器音频解码行为一致。

```bash
git clone https://github.com/dlxeva/voxr.git
cd voxr
python3 -m http.server 4177
```

Open [http://localhost:4177](http://localhost:4177), then:

打开 [http://localhost:4177](http://localhost:4177)，然后：

1. Choose the voiceover delivery purpose. / 选择配音交付用途。
2. Add an `.srt` file. Optionally add matching audio only if you have the right to use it. / 添加 `.srt` 文件；仅在拥有使用权时才添加对应音频。
3. Select **Start analysis**, review flagged timecodes, and export the iteration package. / 点击“开始分析”，复查标记时间码并导出迭代包。

## Privacy and authorization / 隐私与授权

All current analysis runs in the browser. Voxr does not upload, store, transcribe, or send your SRT or audio to a service. The user remains responsible for having authorization to use a cloned voice, audio file, script, and exported material.

当前分析均在浏览器本地完成。Voxr 不上传、保存、转写或向任何服务发送 SRT 和音频。使用者仍需自行确保对克隆音色、音频、文稿和导出材料拥有相应授权。

The repository ignores common audio formats and generated iteration packages by default to reduce accidental commits of private material. Demo SRT fixtures contain only synthetic example text.

仓库默认忽略常见音频格式和个人生成的迭代包，以减少误提交私有内容；演示 SRT fixture 仅含合成示例文本。

## Methodology / 方法论

Voxr is informed by common subtitle-timeline QC practice: cue duration, rate, adjacent gaps, and overlaps identify timecodes worth review. It translates those findings into regeneration actions and generic prompt/JSON handoff for synthesized-voice workflows. This is an independent implementation and does not copy third-party web-tool code.

Voxr 借鉴字幕时间轴质检的常见做法：以片段时长、速率、相邻间隔和重叠定位值得复查的时间码；再把问题转成合成旁白工作流所需的重配动作和通用提示词/JSON。它是独立实现，不复制第三方网页工具代码。

Published research supports the measurement direction—speech rate, context, and pauses can affect perception or intelligibility—but does not directly derive any Voxr preset. The full rationale, five checkable references, and known limitations are in [METHODOLOGY.md](METHODOLOGY.md).

已发表研究支持这一测量方向——语速、上下文和停顿会影响感知或可懂度——但并不直接推出 Voxr 的任何预设区间。完整说明、5 项可核查参考与已知限制见 [METHODOLOGY.md](METHODOLOGY.md)。

## Local workflow position / 在本地工作流中的位置

Voxr is tool-agnostic. Our current local creative workflow commonly uses [Voicebox](https://github.com/jamiepine/voicebox) and [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) to create or clone authorized voices, then uses Voxr after rendering.

Voxr 保持工具无关。我们当前的本地创作工作流常使用 [Voicebox](https://github.com/jamiepine/voicebox) 和 [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) 生成或克隆已获授权的声音，然后在渲染后使用 Voxr 复盘。

```text
Authorized reference + script → TTS / voice-cloning tool → WAV + SRT → Voxr → iteration package → next render
已授权参考音频 + 文稿 → TTS / 音色克隆工具 → WAV + SRT → Voxr → 迭代包 → 下一次生成
```

Voicebox and Qwen3-TTS are independent projects. Voxr neither bundles them nor calls their APIs; the JSON export is a generic handoff, not a direct integration.

Voicebox 和 Qwen3-TTS 均为独立项目。Voxr 不打包它们，也不调用它们的 API；JSON 导出只是通用交接格式，并非直接集成。

## Agent Skill / Agent 技能

The repository includes [`$voxr-rhythm-review`](skills/voxr-rhythm-review/SKILL.md), a small Agent Skill that turns an SRT report or exported iteration package into a prioritized regeneration brief. It validates the v1 package contract, preserves parsing warnings, and keeps the same evidence and authorization boundaries as the web tool.

仓库包含 [`$voxr-rhythm-review`](skills/voxr-rhythm-review/SKILL.md)，这是一个将 SRT 报告或导出的迭代包转为优先级重配简报的小型 Agent Skill。它会校验 v1 交付契约、保留解析警告，并与网页工具保持相同的证据与授权边界。

## Development / 开发

```bash
node tests/run-tests.mjs
```

The tests cover parsing, rate calculations, overlap handling, mixed-language boundaries, safe rendering, and local PCM metric primitives.

测试覆盖解析、速率计算、重叠处理、中英混合边界、安全渲染和本地 PCM 指标基础能力。

## Contributing / 贡献

Issues and pull requests are welcome, especially for reproducible SRT edge cases, accessibility improvements, and clearly sourced methodology updates. Do not include private audio, unlicensed voices, or real client scripts in issues, fixtures, or pull requests.

欢迎提交 issue 和 PR，尤其是可复现的 SRT 边缘案例、无障碍改进和有明确来源的方法论更新。请不要在 issue、fixture 或 PR 中包含私有音频、未获授权的声音或真实客户文稿。

## License / 许可证

[MIT](LICENSE)
