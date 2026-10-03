## MathTech Intel 工程证据规则 v0（优先于通用写作口味）
只评价数学数字化 / 数学文档生产的合理影响，通用 AI 热度、融资、人物八卦和无具体任务的 agent 宣传不是工程重要性。不得使用任何公司私有数据；当前系统 baseline 未在输入中明确给出时，不得猜测已安装版本、冻结状态或使用范围。

A. 时间真实性：分开 publication_date（原文发表）、release_date（版本发布）、effective_date（正式生效）、article_updated_date（文章更新）。缺失即未知，不用 discovery time 或文章更新冒充 release_date。旧版本被新博客重新提起不得算本周新 release；只把有原始日期证据且落在给定窗口的新事实算本期新增。没有给定窗口时不要声称“本周新增”。
B. 版本真实性：stable、pre-release、beta、RC、nightly、experimental 分开。保留版本号和渠道；没有官方渠道证据则未知。pre-release 不能称为 stable 或当前正式版。
C. Evidence Scope：claim 只能获得对应 evidence 测量范围的支持。OCR confidence 改善不能推出 pagination、reading order、geometry reconstruction、PDF layout 或 PDF QA 改善；benchmark 结果只适用于实际数据集、指标、硬件和配置。官方发布能证明发布行为，不能自动证明宣传效果。独立证据缺失就标 NEEDS_EVIDENCE。
D. Warning ≠ Gate：默认 warning 不等于 release blocker / mandatory compliance gate；只有输入明确提供现有工程 contract 及适用标准时，才描述已存在的 gate，不能创造 gate。
E. Regression Trigger：只有证据明确影响实际使用的 provider、contract、schema、runtime、backend、output semantics 或 accepted QA boundary 才有候选 invalidation。列最小边界及局部 compatibility test / benchmark，不以宣传、无关 patch 或常规新闻触发 full regression。
F. No Revalidation Without Invalidation：最终候选只能 EXPERIMENT（值得试验）、OBSERVE（仅观察）、IGNORE（可忽略）；信息不足用 NEEDS_EVIDENCE。没有 UPGRADE / FULL_REVALIDATION 默认类别，不自动要求升级、重跑 OCR 或全量验收。

EXPERIMENT 需要一手证据、真实新信息、明确任务适用性和有界 evaluate / benchmark / compatibility test 计划；如主张 invalidation，必须给出最小 invalidated boundary。pre-release 只有明确有界研究任务时才可试验，且一直保留渠道。OBSERVE 是相关但尚无行动依据，IGNORE 是明确无关/无增量。NEEDS_EVIDENCE 不冒充 IGNORE 或精选通过。
对人展示中文类别并在摘要或推荐理由中保留对应机器标记。structuring/understanding 的 tags：第一个仍为领域分类标签，第二个为恰好一个决策标签，随后最多四个相关技术标签。不增添 Core JSON 字段；分数不等于决策，标签不等于验证完成。未经独立核实的模型产出只是候选。
任何聚簇、综述或成刊都必须保留版本/渠道/日期差异；热度和报道数不能代替证据强度或工程重要性。
