# MathTech Intel v0 Prototype Report

## 验收结论

**STATUS=ADAPT**。AIHOT 可作为公开技术情报采集、去重、筛选、聚类和发布框架；行业层已实现 MathTech Intel 的配置、品牌、选择提示词和最小合成回归案例。但 typed evidence、NEEDS_EVIDENCE 执行闸门、隔离数据库运行验证与真实模型校准仍未完成，因此不声称已可进入 shadow-run。

本轮没有启动采集或 worker，没有部署、连接公司系统、读取私有数据、调用付费模型或执行 migration。安全配置是 `industry/prototype.env.example`，不是已启动服务的运行证明；任何后续本地 smoke 都必须显式使用关闭外部调用的配置与隔离数据库。

## Git 基线与范围

```text
BASELINE_AUDIT
REPO=https://github.com/KKKKhazix/AIHOT
BRANCH=main (before work)
HEAD=3343fe2b20db4be7269113752d82d3992fc52b6b
ORIGIN=https://github.com/KKKKhazix/AIHOT.git
UPSTREAM=origin/main
NODE_VERSION_REQUIRED=>=24.11; actual=v24.19.0
PACKAGE_MANAGER=npm 11.9.0; package-lock.json v3 unchanged
DB=PostgreSQL 17 + pg-boss; 38 SQL files numbered through 0041; not provisioned
SERVICES=api, worker, web, postgres; optional caddy
LICENSE=MIT; LICENSE and NOTICE preserved
UPSTREAM_CORE_STATUS=unchanged; baseline typecheck and architecture tests pass
KNOWN_BLOCKERS=Docker/PostgreSQL/psql unavailable; full DB test/build runtime not established
WORK_BRANCH=prototype/mathtech-intel-v0
FINAL_HEAD=post-commit value recorded in the delivery handoff.json and final acceptance response
```

`main` 和 `origin/main` 未修改。基线完整版本、lockfile 哈希及 migration 清单见 `mathtech-intel-baseline.json`。修改只涉及 `industry/`、文档和需要适应行业 taxonomy/prompt 的测试样例；`apps/`、`packages/`、`db/`、上游脚本、根 package/lockfile、许可证均未修改。根包保留上游内部包名；用户可见行业品牌及资产使用 MathTech Intel，图标为本轮原创 MT monogram。

## 已交付

| 交付 | 路径/状态 |
|---|---|
| 静态审计、真实数据/调用链与安全边界 | `mathtech-intel-static-audit.md` |
| 架构及未来 API/RSS/MCP 接口提案 | `mathtech-intel-architecture.md`；仅设计，无公司集成 |
| 五轴选择契约与六条特殊规则 | `mathtech-intel-selection-contract.md`、`industry/prompts/rules-mathtech.md` |
| evidence candidate | `mathtech-evidence-layer-candidate.md`；v0.1 candidate，未冻结、未迁移 |
| GAP/root cause 与有限后续 | `mathtech-intel-gap-analysis.md` |
| 成本审计 | `mathtech-intel-cost-audit.md` |
| 行业配置 | `industry/site.ts`、`taxonomy.ts`、`topics.json`、`features.ts`、prompts、brand |
| 一手 sources 与核验记录 | `industry/sources.json`、`source-verification.json`；六个全部 disabled |
| 最小 fixtures | `industry/mathtech.gold.jsonl`；复用现有 GoldRow，不新造 benchmark |
| 离线候选规则/测试 | `industry/mathtech-policy.ts`、`tests/mathtech-industry.test.ts`；未接 worker |
| 测试记录 | `mathtech-intel-validation.json`、交付包内 validation-logs |

九个一级分类覆盖目标领域；由于上游 publication 硬编码 `tip`，AGENT_TOOLING 保留 `tip` wire key，通过 label/tag 对外表达。没有为此修改 Core 或数据库。保留七种内容类型与原选择阈值，不声称已校准。Marker、Surya、Quarto、Pandoc、Asymptote、veraPDF 的官方身份由官方页面指向仓库确认，再读取其 releases Atom；六端点均 HTTP 200、合法 Atom。TeX Live 官方请求 403，缺已核实采集端点，未加入 sources；未猜地址或扩大低质量覆盖。

## 选择/evidence 的实效边界

提示词区分四日期、版本渠道、claim scope、warning 与既有 gate，并要求具体 invalidation 才给最小回归建议。六个 synthetic fixtures 的离线 guard 均满足要求，且同一文件可由现有 selection evaluator 读取。测试里的 controlled score 只证明格式、阈值和归一化兼容，不证明模型理解能力；没有付费调用或虚构模型 PASS。

Core 的打分只输出 attentionScore；未自动注入实际 subsystem baseline、版本和来源权威。UNKNOWN prefilter 可以继续，publication 没有 NEEDS_EVIDENCE 强制闸门。标签/摘要只能承载 candidate，不能替代已验证 evidence。所有 sources 与示例外部阀关闭，离线 candidate 可 fail closed；**当前 live pipeline 本身没有获得等价保证**。这是 ADAPT 的主要原因。

## 成本和 recovery

```text
EXPECTED_CALLS_PER_ITEM=5 for a typical passed item before shared downstream work
TOTAL_EXPECTED=5 + G(0..1) + R(0..1) + D/story_size
               + daily/items + weekly/items + monthly/items
PAID_API_CALLS=0
```

五次为 prefilter 一次、score 两次、structure 一次、understand 或 summarize 一次；淘汰、空正文、非发布项与 verbatim 路径不同，group consolidation/pair、重试可增加次数，不能宣称总上限七次。翻译和 embedding 为独立条件路径。确定性过滤→便宜模型→必要时强模型是候选策略，未重写 pipeline。原 budget 按请求计、缺 row 无限制；unknown receipt 半小时后一次自动放行不能保证恰好一次计费，也不等于本项目要求的 Single Controlled Resume。影子运行前需要明确低预算和人工核账策略，不在本轮改 Core。

## Selective validation

| 执行检查 | 结果/检查点 |
|---|---|
| `npm ci --ignore-scripts` | PASS；lockfile 未变 |
| 修改前 `npm run typecheck` | PASS |
| 修改前 `node --test tests/architecture.test.ts` | 5 PASS；Core 未修改，结果沿用 |
| `node --test tests/mathtech-industry.test.ts` | 最终 10 PASS、0 FAIL；包含六 fixtures、来源/分类/提示词检查 |
| 修改后 `npm run typecheck` | PASS；覆盖配置、相关 Core/apps/tests 类型 |
| `node --test apps/web/tests/*.test.ts` | 31 PASS、0 FAIL；SSR/mock，不依赖真实 DB/模型 |
| `npm run build -w @aihot/web` | PASS；品牌资产最后变化后仅重建受影响 web |
| 最后提示词文本修改后的 all-prompt 子集 | 1 PASS；是上述测试的选择性重验，不另加独立计数 |
| `git diff --check` / Core diff / source endpoint probe | PASS；六 feed 探测，无模型调用 |

独立测试合计 **46 PASS / 0 final FAIL**。开发中曾发现 taxonomy 去掉 `tip` 导致 TS2367，以及新测试模板缺少 publishedDate；均为本轮修改问题，已定位并有限修正，不标成 upstream failure。被改动但需 PostgreSQL 的旧 fixtures 仅完成类型验证，未宣称动态通过。

未执行：根 `npm test`、SelectBench DB import/live scoring、migration/seed、真实 api/db 与 MCP smoke、`docker compose config`、真实模型校准。原因是 Docker/PostgreSQL/psql 不可用及本轮成本/范围限制。它们是 NOT_RUN / ENVIRONMENT_LIMITATION；没有任何证据确立 upstream-existing failure。无独立 lint script，未虚构 lint PASS。基线已通过的无关检查没有重复运行；只有配置、提示词和品牌的实际 invalidation 才选择性重验。

## 安全与公司边界

静态审计覆盖 authentication/admin/ingest、URL/DNS/redirect SSRF、HTML、图片代理、secret、CSRF、API/MCP、容器、PostgreSQL 与 rate limit。发现 proxy 信任、暴露默认值、缺全局 read/image limiter、receipt recovery 等部署假设，详见审计，不因发现问题自动重构。未运行 compose、未配置域名/外部数据库，未提交 secret。integration proposal 仅描述 Public Internet → MathTech Intel → API/RSS/MCP → Research Agent → Evidence Validation → Math Digitization decisions；没有实施公司连接。

## 最终验收字段

```text
STATUS=ADAPT
BASELINE_HEAD=3343fe2b20db4be7269113752d82d3992fc52b6b
WORK_BRANCH=prototype/mathtech-intel-v0
FINAL_HEAD=resolved after commit in handoff.json
CORE_MODIFIED=false
DB_SCHEMA_CHANGED=false
MIGRATION_ADDED=false
PAID_API_CALLS=0
PRIVATE_DATA_USED=false
INDUSTRY_CONFIG=industry/
SOURCE_CONFIG=industry/sources.json (6 verified official feeds, disabled)
SELECTION_CONTRACT=docs/mathtech-intel-selection-contract.md + industry prompts
REGRESSION_FIXTURES=industry/mathtech.gold.jsonl (6 synthetic cases) + tests/mathtech-industry.test.ts
EVIDENCE_LAYER=docs/mathtech-evidence-layer-candidate.md (candidate only)
SECURITY_AUDIT=docs/mathtech-intel-static-audit.md (static, complete in scope)
COST_AUDIT=docs/mathtech-intel-cost-audit.md
TESTS_RUN=baseline architecture; MathTech; web; typecheck; web build; prompt subset; static diff/source checks
TESTS_PASS=46 unique test cases; typecheck; web build; relevant static checks
TESTS_FAIL=0 final (resolved development failures documented above)
KNOWN_UPSTREAM_FAILURES=NONE_ESTABLISHED
BLOCKERS=evidence adapter/gate; isolated PG runtime checks; model calibration before shadow-run
NEXT_ACTION=补齐隔离 PostgreSQL 17 环境，执行既有 mock pipeline smoke。
```

本轮收口于此，不自动进入 shadow-run 或其他阶段。
