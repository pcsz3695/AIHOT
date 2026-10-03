# MathTech Intel v0 静态审计

审计日期：2026-10-02 UTC / 2026-10-03 Asia/Shanghai。只读代码审计，不是安全认证、真实采集或生产验收。行号以本基线为准；以下路径均为真实代码。

## BASELINE_AUDIT

```text
REPO=https://github.com/KKKKhazix/AIHOT
BRANCH=main (before modification)
HEAD=3343fe2b20db4be7269113752d82d3992fc52b6b
ORIGIN=https://github.com/KKKKhazix/AIHOT.git
UPSTREAM_REMOTE=not separately configured (origin is upstream)
WORK_BRANCH=prototype/mathtech-intel-v0
NODE_VERSION_REQUIRED=>=24.11
NODE_ACTUAL=v24.19.0
PACKAGE_MANAGER=npm 11.9.0
LOCKFILE=package-lock.json (lockfileVersion 3; unchanged)
LOCKFILE_SHA256=d878102339796c430094361804b87d23e922d69721c1eec2cd5cfcbdb25ff0ed
DB=PostgreSQL 17; pg_trgm; pg-boss owns its queue schema
SERVICES=db/setup/api/worker/web; optional https-profile caddy
LICENSE=MIT (2026 数字生命卡兹克); LICENSE/NOTICE unchanged
UPSTREAM_CORE_STATUS=unchanged; baseline typecheck and 5 architecture tests executed successfully
KNOWN_BLOCKERS=Docker and PostgreSQL executables unavailable; DB tests/live smoke unexecuted
```

运行栈从 package manifests/lockfile 核对：React 19.3.0、React Router 8.4.0、Vite 8.3.1、TypeScript 7.0.2、pg-boss 12.34.0、postgres client 3.4.9、zod 4.6.5、sanitize-html 2.17.7、sharp 0.35.4。Fastify 版本见附带 baseline JSON。npm ci --ignore-scripts 成功，之后 web build 验证已安装构建依赖可工作；没有改 lockfile 或升级依赖。

## A. Architecture

- apps/api：Fastify；app.ts 注册 auth/admin/ingest/site/v1/RSS/agent/MCP/media/OG；公开内容从 backend/publication 读。
- apps/worker：main.ts 注册 queue jobs；schedules.ts 使用 pg-boss cron、Asia/Shanghai；job_runs 记录实际运行。
- apps/web：React Router SSR；server.ts 代理 API 路径；仅 HTTP 访问后端，不持有 DB/provider secrets。
- packages/contracts：DTO、taxonomy、time、http-policy；taxonomy 从 industry 动态导出，不是固定 DB enum。
- packages/backend：采集、内容、editorial、events、providers、publication、reports、jobs、admin、operations。
- industry：site/taxonomy/topics/sources/features/selection/prompts/brand/pages；promptText 支持 includes，promptVersion 是依赖文件内容哈希。
- publication：publish.ts 生成 publications 投影；scope/rules 统一可见性、撤回、全文许可；各公开出口复用此层。暂停 source 不撤回已有页面。

## B. Data

database/migrations 当前 38 个 SQL 文件（编号至 0041；0012、0025、0035 空号）；本轮未运行 migration，未创建数据库。

| 数据 | 真实位置与表达能力 |
|---|---|
| source | 0001_core.sql sources：kind、tier、first_party、participation_mode、config、enabled、全文授权、cursor |
| article | articles：URL identity、content hash、revision、published_at/claim、discovered_at、source_updated_at、timeline_at、raw/body/media |
| scoring | analyses：relevance/category/tags/subjects/score/selected/output、prompt_version、receipt_ids；五轴只是提示词内部计算 |
| event/cluster | 0002 stories/facts/fact_articles/story_signals/heat；0006 embeddings/grouping_decisions；0024 manual grouping overrides |
| reports | reports/report_revisions 内容 JSONB，revision/刊期；publication sort/selected readiness 独立于 release_date |
| receipts | receipts + 0022 receipt_attempts：pending/received/completed/failed/unknown、usage、cost、logical key、attempt identity |
| evaluation | 0009 SelectBench runs/results + 0028 mean score；gold 是 select/reject/either，不是工程决策 enum |
| recovery | 0039/0040、processing attempt tags、retry slots、digest inputs；0041 session credential binding |

## C. 真实调用链

1. sources/collect.ts → rss/web-list/json-list/x/mp collector → content/materials.ts upsertMaterial；jobs/sources.ts 注册入口，ingest/items.ts 是另一个入口。
2. materials.ts identityKeyFor 使用 lib/url.ts URL/Tweet identity；contentHash 对标题/正文/摘要归一化判重，article_revisions 保存变化。并非完整语义重复去重。
3. jobs/content.ts route/queueProcessing → content/extract.ts：仅标题/feed summary 时先取页面；Readability + sanitizeBody；可选付费 Jina fallback。可信 body 缺失为 unconfirmed。
4. editorial/analyze.ts runAnalysis：prefilter → 两次 score；structure 与 score 并行；高分走 understand，低分走 summarize/verbatim/none。不是严格线性结构化序列。
5. normalizeAnalysis：UNKNOWN prefilter 可继续，最终有标题摘要即可能 relevance=pass；两个分数之和决定 selected。MathTech evidence guard 不在此路径，NEEDS_EVIDENCE 标签没有 publication gate。
6. jobs/content.ts processRevision → publishArticle → events.group job；近期 pass 内容归组，历史 backfill 不创事件。
7. events/group.ts/recall.ts/relate.ts：两周窗口、向量或 lexical recall、batch verdict、必要 pair review；facts/stories membership、manual override；consolidate.ts 另有双模型跨故事合并。
8. events/digest.ts → story_digests；reports/compose.ts 读 publication candidates → 日/周/月刊；API/RSS/MCP/Markdown 从统一读取层输出。热度依旧按独立来源计数和衰减，不是工程重要性。

## D. Model 调用及恢复

| capability | 实际调用点 / purpose |
|---|---|
| PREFILTER | editorial/analyze.ts runPrefilter → chatJson / prefilter_article |
| SCORE ×2 | runScores → score_article；score-1/score-2 attemptTag；同规则独立整数 |
| UNDERSTAND | runUnderstand → understand_article；非 retryable 图像拒绝可退文本再问 |
| SUMMARIZE | runSummarize → summarize_article；短中文/极少文本可零调用 |
| STRUCTURE | runStructure → structure_article；与评分并行 |
| GROUP | events/group.ts judgeBatch/judgeSignal；events/consolidate.ts judgeStories |
| GROUP_REVIEW | group.ts confirmMerge；consolidate.ts group_story_review；默认全部 capability 可同一个 default 模型，并不保证不同 vendor |
| DIGEST | events/digest.ts composeStoryDigest → story_digest；inputs_hash/revision 复用 |
| REPORT | reports/compose.ts writeLead/composePeriod → report lead/period；刊期 revision 与 receipt 一起提交 |
| TRANSLATE | editorial/translate.ts translateBatch/translateQuotes；3500-char batches、链接/图片保留失败再试；只翻译允许全文且精选的条目 |

所有 chatJson 经 providers/receipts.ts paidRequest；LLM HTTP 本身在 providers/llm.ts 直接 fetch 配置的 provider URL，不经过 collector 的 guardedFetch。provider URL 是 operator trust boundary。

回执逻辑键绑定 purpose/provider/model/prompt/config/input hash/attemptTag；发送前用 transaction/advisory lock 占预算与 attempt；先存 raw response，再由业务 transaction completeReceipt。received/completed 重用；failed 可以新的 attempt；pending 10 分钟变 unknown。operations/recover.ts 对 unknown 超过 30 分钟自动放行一次，不核账；再次 unknown 等 admin。不能称为 exactly-once 或严格“未知绝不自动重发”。queue analyze/group retryLimit 4，digest 3；预算记录的是请求数，不是金额/token 硬上限。预算行被删将无限制；默认 llm 40000/day 不适合作为小规模 shadow-run 预算。

## E. Security boundary（静态发现，未自动修复 Core）

| 检查项 | 代码证据 / 结论及边界 |
|---|---|
| authentication | admin/auth.ts：12+ 字符 password、签名 cookie、DB session、credential binding；dev admin 仅非 production；config.ts production secret/assert guard。prototype 禁用 dev bypass |
| admin API / CSRF | routes/admin.ts 经 adminHandler；admin-auth.ts 非 GET/HEAD 需 x-csrf-token；logout POST 不查 CSRF（登出干扰风险）；login 10/IP + 50 total /15min，进程内 map |
| ingest | routes/ingest.ts：16+ token、拒绝 placeholder、constant-time bearer compare；10/IP/min；malformed batch 在 ingest/items.ts 拒绝；本轮不配置 token、不开放入口 |
| URL/SSRF | lib/url.ts/http-fetch.ts：http(s)、DNS/address guard、connect-time lookup、每次 redirect、deadline/max bytes、敏感 header/body 同源跳转。ALLOW_PRIVATE_NETWORK_FETCH 能绕过；198.18/15 明确允许，egress proxy 使用较窄 internal 检查，代理必须可信；不是无条件完整 SSRF 防护 |
| HTML | content/sanitize.ts 标签/属性/scheme 白名单，移除 script/forms/svg 等；MathML unwrap/annotation 丢弃，不能作为精确数学证据保真通道；摘要只作索引，需回原文 |
| image proxy | media/imgproxy.ts HMAC + expiry；routes/media.ts 签名验证先于 fetch；images/renditions 限尺寸/字节，nosniff；仍需资源限流和可信 proxy 配置 |
| secrets | backend 分组读取 env；日志 redact cookie/authorization；回执只存 request hashes，不存 key。provider response/error 仍是 operator 需审查的日志/持久化输入；本轮没有提交或读取真实 secrets |
| API exposure | anonymous read-only API/RSS/agent，不读 admin session；public routes through publication。api app trustProxy=true；web server 仅 TRUST_PROXY=true 才信 forwarded headers，直接暴露 api 会弱化 IP 限流假设 |
| MCP | routes/mcp.ts：只读 publication 工具、Host/Origin allowlist、256KiB body、query limits、外部文本明确 untrusted；受 forwarded-host 和可信 ingress 假设约束，无全局 distributed rate limiter |
| containers | Dockerfile 最终 USER node；无 privileged/host networking/docker socket mount；postgres 容器默认用户策略未动态核实。web 默认端口发布所有接口，caddy 可发布 80/443，本轮不启动 |
| PostgreSQL | compose 不发布 DB host port；默认密码 fallback 为 aihot 是不安全配置 fallback；本轮无外部 DB，未写生产凭据 |
| rate limiting | 登录/ingest/feedback 有局部限制；公开 API/MCP/image 主要靠参数上限/cache，未见全局请求速率或 distributed limiter。上线前 ingress 策略需另定 |

审计不证明不存在其他漏洞。以上风险在隔离离线 v0 中不阻塞配置研究，但禁止据此生产暴露。

## 一手来源核查

industry/source-verification.json 保存官方归属链接和 6 个 feed 的 HTTP 200 / Atom / entry 数实查结果。官方页面 → repository：Marker/Surya PyPI Repository 链接；Quarto 官网下载；Pandoc 官网 releases；Asymptote 官方 Help；veraPDF 官网 release notes 链接。

TeX Live：官方 https://tug.org/texlive/ 本次 fetch 403；官方 build docs https://www.tug.org/texlive/doc/tlbuild.html 指明 canonical SVN 及 GitHub 镜像背景，未猜 releases feed，NOT_SEEDED。没有自动加入通用 OpenAI feed；相关 agent 情报可通过未来有界来源另行核实。
