# MathTech Intel v0 成本审计

PAID_API_CALLS=0。理论成功路径由真实调用代码核算，不是实测费用。

| 阶段 | 每 item 逻辑 LLM 次数 | 条件 |
|---|---:|---|
| deterministic source/URL dedup/body routing | 0 | upstream 已有机械去重；证据 guard 当前仅离线 |
| prefilter | 1 | BLOCK 即停；UNKNOWN 仍继续（成本/证据 gap） |
| score | 2 | tier 有 threshold；两次独立请求，不是一次抽两个数字 |
| structure | 1 | all stages 与 score 并行；即使低分也发生 |
| understand 或 summarize | 通常 1 | selected/near-selected understand；否则 summarize；短中文或极少文本为 0；图像拒绝可再问一次 |
| group | 0–1 | 有候选时 batch；exact URL/无候选可省；signals 路径另有判断 |
| group review | 0–1 | 不够明显的合并确认；跨故事 consolidate 可能额外 group+review 两次，按候选关系数量计 |
| digest | 每次 story inputs 变化 1 | 按事件摊销，不固定每 item；同事件后续会重生成 |
| report | 每非空日报/周报/月报 1 | 是每份报告，不是每 item；按刊载数摊销，空刊可零 |
| translate | 当前 0 | 六源 site_fulltext=false，因此 selected fulltext 条件不成立；若未来授权全文，约 ceil(chars/3500)+失败批重试，块边界/大块影响不能当精确公式 |

EXPECTED_CALLS_PER_ITEM（无 retry、无跨 story consolidation、摘要 source）：
- 重复/未进入分析：0；prefilter BLOCK：1。
- 一般通过且完整的 item：1+2+1+1 = 5。
- cluster 有候选/需 review：5–7；再加 digest 和 report 按事件/刊期摊销。
- 公式：5 + G + R + D/S + daily/Nd + weekly/Nw + monthly/Nm；S 是一次 digest 涉及 item 数，N 是各报告刊载数。
- 嵌入另算 0–1 次 embedding 请求/item（批量复用），不是 chat LLM；Jina fallback 是另一种付费请求。当前全为 0。

不存在全系统固定“最多 7 次”保证：queue retries、failed/unusable responses、图像回退、consolidation、重复 digest 与明确 re-evaluate attemptTag 都可能增加请求。received/completed 复用零新增付费；unknown 半小时放行一次可能重复计费。预算是 request-count 硬停，不是金额/token；默认 40000 llm/day 需要降低，但本轮无 DB 写入或预算配置变更。

## 最小策略（提案；未重写 pipeline）

cheap deterministic filtering → inexpensive model → strong model only when needed。

1. 仅六官方 sources，limit=2 初次回填；source enabled=false。本轮离线 candidate guard 在明显无关/旧版本/缺 metadata 时先决定 IGNORE/OBSERVE/NEEDS_EVIDENCE，不问模型。
2. 以后 ingestion adapter 在模型前补官方 metadata 并机械去重；优先保留完整 release body，减少 page/Jina fallback。它尚未在 worker 接线，不能冒称已实现节省。
3. PREFILTER/STRUCTURE/SUMMARIZE 使用低成本模型，SCORE 两次保留 upstream contract；难例/冲突再由强模型处理，切模型用现有 capability 设置，不增另一 provider runtime。
4. GROUP 无候选跳过，review 只在 ambiguity，digest 只在 inputs hash invalidation；report 按需有限刊期，不重生成已有效报告。
5. 禁全文翻译、X/公众号付费抓取、通知、IndexNow。不得为了省成本未经验证删一次评分或合并 score/structure。
6. 相同输入/prompt/version 复用 receipts；只有 invalidation 才显式新 attemptTag。shadow-run 先定义 item 数和日请求预算、未知 outcome 核账规则。

若未加 adapter，只改 industry prompts 不会把 upstream 的 5-call 路径降至 1-call；该限制是 ADAPT 的一部分。
