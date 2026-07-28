# 合成旁白节奏检查：方法与边界

## 当前版本做什么

工具服务于授权音色克隆与合成旁白的交付复盘。它读取 SRT 的时间戳和文本，计算字幕覆盖时长、完整时间线时长、字幕之间的间隔、中文字符数和英文词数。它据此显示 CPM、WPM、字幕覆盖外时间占比、间隔频率和相邻字幕的语速变化。

核心 SRT 报告不分析音频、画面、语气、音乐、镜头或说话者意图。试验性的 Audio QC Lite 仅测量下文所述的 PCM 样本指标。

## Audio QC Lite（试验功能）

用户确认拥有授权后，可在浏览器本地导入一份音频。工具将音频解码为 PCM 样本，显示波形、样本峰值、RMS 平均能量、接近满刻度样本数量，以及与 SRT 时间线的时长差。导入 SRT 后，也会列出相对较低能量的字幕区间供回听。

这些指标不等同于 LUFS、True Peak、音高、情绪、可懂度或音色相似度。当前版本没有实现 EBU R128 的加权、门限和校验流程，因此不会报告 LUFS。

## 场景参考区间

`profiles.js` 里的区间来自当前的制作复盘规则，服务于纪录片、解释型视频、产品视频、短视频、儿童内容和访谈等不同场景。它们是可调整的工作参考，用来标出值得回看的片段。每个预设的时间线语速由有效语速与字幕覆盖外时间占比推导，避免三组目标彼此矛盾。

下方文献支持“语速、留白和上下文会影响语音感知或可懂度”这一测量方向。文献没有直接推出本工具里任何一个 CPM、WPM 或停顿区间。任何对外材料引用这些数据时，都应标注为本工具的制作参考。

## 字幕间隔

工具仅按相邻字幕的时间差分组：短间隔为 0.20 至 0.49 秒，中间隔为 0.50 至 0.99 秒，长间隔为 1.00 至 2.99 秒，超长间隔为 3 秒及以上。少于 0.20 秒的间隔标为极短。

同一个时长可以服务于换气、语法、理解、情绪或转场。用户需要结合实际声音和画面判断它的作用。

## 已知限制

- SRT 的显示时间不等于实际开口时间。报告中的“字幕覆盖时长”和“字幕覆盖外时间”描述的是时间轴，不能直接称为发声时长或静音时长。
- 若字幕时间轴存在重叠，工具会按覆盖区间合并计算覆盖时长；它无法从 SRT 判断是多人同时说话、双语字幕还是时间码错误。
- 中文按汉字计数，英文按词计数。中英混合内容会分别显示两种速率。
- 中英混合内容不输出单一的间隔频率、波动值或场景基准判断。
- 极短或文本极少的单条字幕会产生不稳定的瞬时速率，不参与相邻语速变化提示。优先看整段趋势，再回看具体条目。
- 工具只在浏览器本地运行，当前版本没有同步、协作或云端保存能力。

## 可核查参考

1. Yuan, J. & Church, K. (2021). *Speaking Rate and Tonal Realization in Mandarin Chinese: What Can We Learn From Large Speech Corpora?* ICASSP 2021, pp. 6463–6467. [会议条目与摘要](https://www2.securecms.com/ICASSP2021/Papers/ViewPaper_MS.asp?PaperNum=4465)。这项语料库研究说明中文语速及其韵律表现需要在具体语料中观察。

2. Pitt, M. A., Szostak, C. & Dilley, L. C. (2016). *Rate dependent speech processing can be speech specific: Evidence from the perceptual disappearance of words under changes in context speech rate.* *Psychonomic Bulletin & Review*, 23, 334–345. [PubMed](https://pubmed.ncbi.nlm.nih.gov/26392395/) · [DOI](https://doi.org/10.3758/s13414-015-0981-7)。支持把相邻或上下文中的速率变化视作值得回听的信号。

3. Lai, W. & Dilley, L. (2016). *Cross-linguistic generalization of the distal rate effect: Speech rate in context affects whether listeners hear a function word in Chinese Mandarin.* Speech Prosody 2016. [开放论文 PDF](https://www.isca-archive.org/speechprosody_2016/lai16b_speechprosody.pdf)。研究展示中文普通话的上下文语速可以影响词的感知。

4. Breznitz, Z. (1990). *Vocalization and pauses in fast-paced reading.* *The Journal of General Psychology*, 117(2), 153–159. [PubMed](https://pubmed.ncbi.nlm.nih.gov/2366048/) · [DOI](https://doi.org/10.1080/00221309.1990.9921132)。研究直接测量了朗读加速时的发声时间、停顿时间与停顿频率。

5. Mahr, T. J., Rathouz, P. J. & Hustad, K. C. (2024). *Speech Development Between 30 and 119 Months in Typical Children III: Interaction Between Speaking Rate and Intelligibility.* [PubMed](https://pubmed.ncbi.nlm.nih.gov/39680790/)。大样本儿童语音研究报告了语速与可懂度之间的速度和准确性权衡，因此儿童预设保持较慢的制作参考。
