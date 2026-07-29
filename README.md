# Voxr

[![License: MIT](https://img.shields.io/badge/License-MIT-f0c675?style=flat-square)](LICENSE)
![Processing: local in browser](https://img.shields.io/badge/Processing-local%20in%20browser-496b5b?style=flat-square)
![Server: not required](https://img.shields.io/badge/Server-not%20required-6a5b87?style=flat-square)
![Agent Skill: included](https://img.shields.io/badge/Agent%20Skill-included-8a5c3f?style=flat-square)

**面向 AI 合成旁白交付的本地节奏复核与工作流交接工具。**

[English](README.en.md) · [方法、参考与边界](METHODOLOGY.md) · [Agent Skill](skills/voxr-rhythm-review) · [迭代包 Schema](schemas/voxr.voice-iteration-package.schema.json)

Voxr 是一个面向 AI 合成旁白交付的本地节奏复核工具。它读取 SRT 时间轴，并可选读取一份已获授权的旁白音频，帮助创作者检查节奏、定位建议优先回听的片段，并把可解释的复核依据、JSON 与重配提示词交给下一步 TTS 或剪辑流程。

## 能做什么

- 本地解析 `.srt`，报告字幕覆盖、时间线时长、间隔、中文 CPM、英文 WPM 和相邻片段语速变化。
- 按解释型视频、纪录片、产品视频、短视频、儿童内容等配音用途提供制作复盘预设。
- 用户确认拥有授权后，使用 Audio QC Lite 查看 PCM 波形、样本峰值、RMS 能量、接近满刻度样本、首条/尾部时间线索与低能量字幕区间。
- 输出带时间码的复核建议和 `voice-iteration-package.json`，方便交给人或 AI Agent 继续处理。

## 不能做什么

Voxr 不是专业广播测量套件，不会测量 LUFS、True Peak、音高/F0、情绪、可懂度、音素对齐、音色相似度，也不会判断版权或声音授权。它把 SRT 覆盖与间隔当作时间轴事实，不等同于真实发声或静音。

完整依据与限制请看 [METHODOLOGY.md](METHODOLOGY.md)。

## 快速开始

```bash
git clone https://github.com/dlxeva/voxr.git
cd voxr
python3 -m http.server 4177
```

打开 `http://localhost:4177` 后：选择配音用途 → 导入 SRT →（可选）导入有使用权的对应音频 → 点击“开始分析” → 导出迭代包。

## 隐私与授权

当前所有分析均在浏览器本地进行，不上传、保存或发送 SRT/音频。使用者需要确保对克隆音色、音频、文稿和导出材料拥有使用授权。仓库默认忽略常见音频格式和个人生成的迭代包，避免误提交私有内容。

## 方法论

Voxr 借鉴字幕时间轴质检的常见做法：以片段时长、速率、相邻间隔和重叠定位值得复查的时间码，再把问题转成合成旁白工作流所需的重配动作和通用提示词/JSON。它是独立实现，不复制第三方网页工具代码。

已发表研究支持“语速、上下文和停顿会影响感知或可懂度”这一测量方向，但不直接推出 Voxr 的任何预设区间。完整的可核查参考、方法与边界在 [METHODOLOGY.md](METHODOLOGY.md)。

## 本地工作流

我们当前的本地工作流常使用 [Voicebox](https://github.com/jamiepine/voicebox) 与 [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) 生成或克隆已获授权的声音，然后在渲染后使用 Voxr：

```text
已授权参考音频 + 文稿 → TTS / 音色克隆工具 → WAV + SRT → Voxr → 迭代包 → 下一次生成
```

Voxr 不打包 Voicebox 或 Qwen3-TTS，也不调用它们的 API；JSON 导出是通用交接格式，不是直接集成。

## Agent Skill

仓库包含 [`$voxr-rhythm-review`](skills/voxr-rhythm-review/SKILL.md)，用于把 SRT 报告或导出的迭代包转成优先级重配简报。它会校验 v1 交付契约、保留解析警告，并维持相同的证据和授权边界。

## 开发与贡献

运行 `node tests/run-tests.mjs`。欢迎提交可复现的 SRT 边缘案例、无障碍改进和有明确来源的方法论更新；请不要提交私有音频、未获授权声音或真实客户文稿。

## 许可证

[MIT](LICENSE)
