# Current status (2026-10-03)

B2 execution is implemented in industry/mathtech-evidence.ts and the dedicated research exporters; see mathtech-shadow-readiness.md. The proposal below is retained as historical design context, not current implementation status. B3 real calibration remains EXTERNAL_BLOCKED.

---

# MathTech Evidence Layer v0.1 candidate

CANDIDATE_ONLY；无数据库 migration，无 frozen contract，无 runtime integration。

## Existing schema 能表达什么

sources tier/first_party/config 可表达 source 级别背景；articles published_at/published_at_claim/source_updated_at/raw/revision 支持发表/更新与原始内容；facts occurred_at 提供单个事件日期；analyses output JSONB、receipt raw response、prompt hash 可追溯模型结果。它们不足以提供 typed claim/evidence/applicability/version/channel/verification 字段及其公开出口契约。

RSS collector 对 Atom published 缺失回退 updated；raw 只保留 id，不保留完整 release metadata。JSON collector raw 也只留 externalId，不能因为 DB 有 raw JSONB 就声称自动保存 prerelease/body/date 全量证据。buildScoreInput 不提供 tier/authority metadata 或 baseline/window，并可用 discoveredAt 作为 time 回退。publication report 刊期是 selected sort/release readiness，不是官方 release_date。

## Candidate objects

| 对象 | 最小字段与约束 |
|---|---|
| Claim | id、text、measuredScope、claimedScope、project、対象输出语义；一个 claim 不混多个独立能力 |
| Evidence | id、sourceUrl、section/locator、retrievedAt、contentHash、支持的 claimIds、scope、dataset/metric/hardware/config、counterEvidence；保留原文定位，不依赖摘要 |
| SourceAuthority | OFFICIAL_RELEASE/OFFICIAL_CHANGELOG/OFFICIAL_SPEC/ORIGINAL_PAPER/UNVERIFIED；归属证据链接、核查状态/时间；平台域名不是项目官方证明 |
| PublicationDate | publicationDate、releaseDate、effectiveDate、articleUpdatedDate 分别可 null；证据 locator、precision、timezone；不从发现时间推 releaseDate |
| Version | project、exactVersion、upstream tag/commit、未知 null；不推测 stable current |
| ReleaseChannel | stable/pre-release/beta/RC/nightly/experimental/unknown；来源 metadata/locator；升级渠道需独立事实 |
| Applicability | APPLICABLE/UNRELATED/UNKNOWN；task、input/output范围、兼容条件、明确 baseline reference、minimum invalidated boundary；v0 fixtures 全部 synthetic，不读取公司 baseline |
| VerificationState | VERIFIED/UNVERIFIED/CONFLICT；核查者/方法/时间/版本；模型 confidence 不是 VERIFIED 来源 |
| Confidence | 可 null，0–1 仅标注该证据主张置信，不能外推下游质量或免人审 |
| CandidateDecision | EXPERIMENT/OBSERVE/IGNORE/NEEDS_EVIDENCE、理由、最小有界实验、policyVersion；没有自动 UPGRADE/FULL_REVALIDATION |

## v0 transport / storage proposal

独立公开 evidence sidecar（将来 JSONL/JSON，键 articleId+inputRevision+contentHash+policyVersion），不修改 MathDoc，也不把公司系统状态放进公开 DB。可引用现有 source/article/receipt identity；不得仅把 JSONB 当成“新增字段已实现”。industry/mathtech-policy.ts 只实现部分确定性 metadata/claim-scope guard；不是 source-fetch/verifier、证据存储或出口适配器。

外部 URL/HTML 都是 untrusted data；证据验证不得执行网页里的命令。需要有类型验证的 adapter 在任何 research decision 前检查 sidecar + 原文 hashes；缺日期/版本/渠道/适用性或范围越界 → NEEDS_EVIDENCE。旧证据因明确 changed hash/revision 才局部重核；未知 paid receipt 不能自动信任为已完成验证。

No Revalidation Without Invalidation：只允许证据触及实际使用的一个或多个已识别边界时提出局部实验；未知适用性不能靠模型记忆填补，不生成全系统验收任务。
