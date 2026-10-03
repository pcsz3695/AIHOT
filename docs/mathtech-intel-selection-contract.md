# MathTech Intel Selection Contract v0

状态：prototype candidate；不是 frozen contract，也未经真实模型校准。

## 选择标准

sig 是数学生产链实际影响；nov 是相对已知 baseline 的真实增量；cred 是 claim 的一手证据强度；reson 是与数学数字化任务相关度；act 是有界工程行动的可用性。没有 baseline 输入则 nov 不能声称已比较实际安装版本。热度、来源数、融资和大厂身份不代替工程重要性。

selection-score.md 保持七种内容类型、五轴整数加权、噪声压制、安全边界、attentionScore 单字段 output。权重每行和 10。SELECTION 的 T1=60/T1_5=65/T2=76/understandFloor=50 保持 upstream，不凭感觉调数；待用户标注 corpus 的 SelectBench 校准后才能解释精确率/召回率。

## 固化规则

A 日期：publication_date / release_date / effective_date / article_updated_date 分开；旧 release 重提不当本期新 release；无窗口不声称本周新增。
B 渠道：stable / pre-release / beta / RC / nightly / experimental；缺官方证据为 unknown。
C scope：OCR confidence 不推导 pagination、reading order、geometry reconstruction、PDF layout 或 PDF QA；公告只证明发布动作，benchmark 仅支持其指标/数据/硬件范围。
D warning：没有现有 compliance contract 时不创造 release blocker 或 mandatory gate。
E trigger：仅实际使用 provider/contract/schema/runtime/backend/output semantics/accepted QA boundary 的变化可能触发局部 invalidation。
F no revalidation：只有具体 invalidation 才有最小回归建议；默认不升级、不全量验收、不重跑成功 OCR。

这些规则通过 rules-mathtech.md include 到 prefilter、score、understand、structure、summarize、group、digest、report、translate；由 upstream promptVersion 记录内容哈希。

| machine decision | 中文 | 条件 |
|---|---|---|
| EXPERIMENT | 值得试验 | 一手已核实、新信息、明确适用任务与有界试验计划；如有 invalidation 列最小边界 |
| OBSERVE | 仅观察 | 相关但无当前行动或为历史背景 |
| IGNORE | 可忽略 | 明确无相关性/无价值增量 |
| NEEDS_EVIDENCE | 证据不足 | 证据、日期、渠道、novelty 或 applicability 不够，不能猜 |

当前 Core 不接受新 decision 字段。理解/结构化提示词使用第二个 tag 和摘要/推荐理由承载 candidate label；标签并无 runtime 必填/互斥约束，也不是强制 publication gate。summary 被压缩可能失去细节，因此 evidence sidecar 是下一步 adapter 的候选设计，不能用公开摘要当完整证据。

## 最小 fixtures 与复用

industry/mathtech.gold.jsonl 复用 scripts/eval-selection.ts GoldRow：material/sourceFacts/samplingContext/gold。额外 mathtech.candidate/expected 被上游 evaluator 忽略，用现有 node --test 框架检验离线 guard。六个都是明确标记 synthetic 的 development 案例，不是假冒官方更新，也没有 holdout 泛化证据。

| case | 检验 |
|---|---|
| 01 | 一年前 release 被今日博客提起 → OBSERVE、newRelease=false |
| 02 | confidence-only + unsupported downstream claim → NEEDS_EVIDENCE；仅 confidence 支持 |
| 03 | pre-release → 保留渠道，不能 stable；newRelease 不等于 stable |
| 04 | default warning → OBSERVE，complianceGate=false |
| 05 | unrelated patch → OBSERVE，invalidatedBoundary=null，fullRevalidation=false |
| 06 | 使用的 canonical output semantics 改变 → EXPERIMENT，仅 output_semantics |

测试还验证元数据缺失 fail closed、日期/渠道、来源 config 白名单、tags、所有提示词渲染和 hash。相同 fixture 用 upstream buildScoreInput/ScoreSchema/normalizeAnalysis 验证格式和阈值，controlled score 不是模型判断能力证据。

未执行 scripts/eval-selection.ts 的 live scoring、SelectBench DB import 或真实模型校准。未来仅在本地 mock provider + throwaway DB 上复用此脚本；不得因为 fixtures 可读而声称模型已达到期望语义。
