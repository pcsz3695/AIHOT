# MathTech Intel v0 Gap Analysis

结论：ADAPT。行业配置与执行框架可复用，尚不能作为已验证、机器可消费的工程决策层。

| GAP | 根因 | 本轮处理 | 有限后续 |
|---|---|---|---|
| typed evidence / decision | score 单字段；structure fact 很浅；public outputs 无 typed channel/applicability | 离线 guard + prompts/tags + evidence candidate；无 schema 改动 | 公开 evidence sidecar 和只读 adapter，先 mock |
| NEEDS_EVIDENCE publication gate | UNKNOWN 可继续，normalizeAnalysis 依两个分数；labels 无强制互斥 | sources/模型关闭；明确 candidate-only | 下游 evidence validator fail closed，不直接执行标签 |
| time/channel provenance | feed published 可回退 updated；JSON raw 不保留 release metadata；scorer 缺 baseline/window | 四日期/渠道规则与 fixture；unknown 停决策 | 原始 release metadata + locator 的小 adapter |
| heat != engineering priority | 独立来源计数/衰减仍是热点算法 | UI/报告提示不把热度当工程重要性 | Research Agent 使用 evidence/适用性，不按 heat 执行 |
| calibration | upstream 阈值为 AI 口味；六 synthetic examples 不是标注 corpus | 阈值 unchanged；无性能宣称 | 既有 SelectBench + 人标小 corpus/holdout，先 mock 验证再定成本 |
| DB runtime environment | 无 Docker/PostgreSQL | ENVIRONMENT_LIMITATION（详见报告）；不假称 smoke PASS | 带 PG17 的隔离测试环境跑未执行 gate |
| industry leakage | publication/items.ts 硬编码 tip/opinion | AGENT_TOOLING wire key=tip，Core 未改；邻近 typecheck 恢复 | adapter 对外标准化映射，不本轮重构 |
| source coverage | TUG official fetch 403，未核验采集端点；未引入通用 Codex feed | 六官方 releases；TeX Live NOT_SEEDED | 一手端点/日期映射核实后逐个添加 |
| budget/recovery | 默认请求阀开启、llm 40000/day、删预算无限制、unknown 半小时一次放行 | 非 secret safety config 关闭所有外部阀，未改 Core | shadow-run 前显式低请求预算/人工核账策略 |
| security/exposure | compose web 默认 all interfaces；trust proxy 假设、无全局 read/image limiter | 仅审计、不运行 compose、不发布 | 独立 loopback smoke 配置与 ingress 策略 |
| upstream fixtures | 默认 AI taxonomy 和 prompt dispatch 出现在测试样例 | 只移植涉及分类/标签/提示词路由的 fixture literals | 有 PG17 时选择性执行相关 DB tests；没有动态 PASS |
| branding/privacy | 未授权上游品牌；条款页是模板 | 原创 MT monogram/wordmarks，保留 MIT/NOTICE；条款未冒称生效 | 生产前运营主体审核（不属于 v0） |

没有关键架构 blocker 要求弃用 AIHOT，也没有证据支持大重构或迁移。ADAPT 不等于可自动进入 shadow-run：证据 gate、mock pipeline/runtime 和 calibration 仍需收口。
