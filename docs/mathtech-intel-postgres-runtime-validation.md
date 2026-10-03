# MathTech Intel v0 — PostgreSQL runtime controlled resume

## 结论与最近检查点

**STATUS=BLOCKED**。阻塞在 runtime 执行环境与可写 CI 目标，不是已确认的 Core defect。PostgreSQL 17、空库 migration、生产路径 mock smoke、DB 读回与幂等检查均 **NOT_RUN**；不得以配置完成替代 runtime PASS。

- START_HEAD：`cb8e1957f101773a91bcebea3775c8a17a115e28`
- BRANCH：`prototype/mathtech-intel-v0`
- FINAL_HEAD：交付后的最终提交 SHA 见最终验收字段；提交内报告不嵌入自身哈希。
- 沿用有效的行业原型、审计、selection contract、46 targeted tests、typecheck、web build。未重新执行这些 runtime tests、全 web 或 architecture audit。
- 本轮只新增一个现有 Node test 框架内的 smoke 和一个窄 CI workflow；无 Core/schema/migration/依赖变更。

## Root Cause First：实际环境证据

本机没有 Docker/PostgreSQL/psql。官方 PGDG 软件包端点可达，下载 PostgreSQL 17.11 软件包成功，但下载不等于运行。

`/proc/self/uid_map` 与 `gid_map` 都只包含 `0 0 1`。APT 默认 `_apt` 用户切换报 `seteuid 42 ... Invalid argument` / `setgroups ... Operation not permitted`；仅在临时下载阶段指定 root 与 scratch cache 后成功。没有安装全局 PostgreSQL、创建常驻 cluster 或启动 system service。

`unshare --user --map-user=1000 --map-group=1000 id` 报 `/proc/self/uid_map: Operation not permitted`。现成用户态工具 proot 在默认和工具建议的 `PROOT_NO_SECCOMP=1` 模式都报 `ptrace(TRACEME): Operation not permitted`。因此无法在本云端建立正常非 root PostgreSQL runtime。本轮没有修改 PostgreSQL 的 root 检查、伪造 UID 或继续绕过此边界。临时 PGDG apt source 已移除，没有留下数据库服务。

按要求转向 GitHub Actions。已连接账号 `pcsz3695`；`KKKKhazix/AIHOT` 的 connector 返回 `push=false`、`pull=true`。`pcsz3695/AIHOT` 返回 404；仅检索该账号公开 AIHOT fork / MathTech repository 的结果均为空。没有读取公司私有仓库内容、建立 fork、修改上游、提交 PR 或执行远程 CI。

可写的公开隔离仓库目标未提供，仓库问题没有收到答案。不能擅自选择公司仓库，也不能假设已有 Actions run。故收口为 BLOCKED，等待 `owner/repo`，不重复本地失败尝试。

## 已准备的最短 production codepath

`tests/mathtech-runtime.test.ts` 复用 `tests/setup.ts` 的 throwaway DB 命名检查、loopback HTTP stub、tag 和现有 Node test runner。

1. 用真正的 `@aihot/backend/db` 查询 server_version_num，必须为 17；检查 DB 名后缀及 migration 清单；要求 article 空表。
2. 建立明确 SYNTHETIC 的 editorial T1 source fixture，不伪称官方来源。
3. Fastify inject 真实 `registerIngest` → `ingestItems` → `upsertMaterial` → pg-boss enqueue。fixture 仅合成数据。
4. 现有 ingest 接口只接受 metadata，不接受正文。测试以现有 `upsertMaterial` 模拟 collector/extraction 的已取得正文交接，产生一次真实 revision；不直接伪造 analyses，也不抓取外网页面。真实 extraction HTTP、scheduler 和异步完整 worker 不属于这个最短 smoke。
5. 直接调用真实 `processArticle` → prefilter mock → score mock ×2 / structure mock → understand mock → receipt/business persistence → `publishArticle`。所有五次模型兼容 HTTP 都限定在同一个 upstream loopback stub；全局 fetch 对其他 origin 抛错；外部采集/模型 worker/推送阀关闭。没有启动 worker、group/digest/report 或付费 provider。
6. 读 articles、analyses、receipts、publications、selected_ledger、pgboss.job，检查五个 completed mock receipts 和真实保存的 selected/category/score 等字段。
7. 真实 v1 HTTP route 在 180 秒 release gate 内应为空；随后复用允许注入 `now` 的 `v1Items(query, now)`，仅前移读者测试时钟，验证公开读回。没有手改 release gate、等待 180 秒、调用 group 模型或绕开 publication 规则。
8. 同一个 ingest fixture **最小重复一次**，created=0，模型请求仍为 5；检查 article/revision/analysis/receipt/publication/ledger/job 均保持原状态、读回相同。source 的收件时间与 ingest_events 接收审计允许变化，不能把日志重复当成业务重复。

### 幂等契约的精确边界

相同入口输入不产生新处理任务是本次 idempotency contract。不要额外强行重调 processArticle 来要求所有 DB 行不变：上游 analyzeArticle 明确复用 receipt 响应但追加 analysis 审计行，publication.analysis_id 会跟随。该行为来自真实静态代码，不是已执行测试或本轮确认的缺陷。没有因此修改 Core。

新 smoke 的断言尚未实际执行；类型检查或静态阅读不能证明 SQL、mock routing、migration 和读回已经通过。若 CI 失败，只从对应最小失败边界修复，不启动既有全量 46 tests。

## 最小 GitHub Actions 配置

新增 `.github/workflows/mathtech-runtime.yml`；既有 `check.yml` 未改。复用其 postgres:17-alpine、Node 24、完整 SHA 固定的 GitHub-owned actions、锁文件安装和 `node scripts/migrate.ts`，没有第二套 DB framework。

- 仅手动 dispatch，或原型分支 runtime 相关路径变化触发；不监听 main/PR，不部署。
- PostgreSQL 为 GitHub-hosted ephemeral service，DB 名 `mathtech_runtime_ci`，宿主端口仅 `127.0.0.1:5432`。
- 本地 runner service 使用 trust auth，仅一次性独立环境，不配置持久 credential 或外部 DB；不提交 API key/token/password。测试需要的 stub/ingest 值在内存随机生成。
- 在 migration 前检查 PostgreSQL 17 与 public schema 空表；然后执行原迁移脚本；只执行 `node --test --test-concurrency=1 --test-timeout=45000 tests/mathtech-runtime.test.ts`。
- DB service 随 job 结束销毁；工作流 timeout 10 分钟；不运行全 test、全 typecheck、web build 或 production smoke。
- 若成功，stdout 含真实 DB version、migration count、article id/revision、持久化计数、mock HTTP 次数和验收字段。只有对应确切 commit 的 job log 才能关闭 runtime gate。

最短恢复操作是提供可写的公开 fork `owner/repo`，将本原型分支提交推送到该目标，让窄 workflow 运行并读取结果。不得推送上游、触发无关全量 workflow 或重新执行已有效测试。未获得此目标前，CI service 仅 CONFIGURED，非 RUNNING/PASS。

## 实际执行验证

| Check | 实际结果 |
|---|---|
| 起点与 branch/status 读取 | `cb8e195`、原型分支、开始时 clean |
| `node_modules/.bin/tsc -p tests` | PASS；仅本轮测试类型边界，不运行旧 tests |
| 最后 SQL 字段修正后的测试 package typecheck | PASS；重验因新文件发生修改 |
| YAML parse + 窄 trigger/permissions/service/安全阀/migration/单测试命令检查 | PASS；静态检查，不是 GitHub Actions 执行 |
| `git diff --check` | PASS |
| PostgreSQL 17 runtime / initdb / app DB access | NOT_RUN / ENVIRONMENT_LIMITATION |
| 空库 migration / persistence / dedup / idempotency / mock smoke | NOT_RUN |
| GitHub Actions run | NOT_RUN；无可写公开目标 |

执行的 static/type checks 最终 0 fail；runtime test cases 执行数量为 0，不得给 runtime 标 0 fail = PASS。运行环境探测失败是明确的 blocker，不标成 upstream code failure。

## 最终字段

```text
STATUS=BLOCKED
START_HEAD=cb8e1957f101773a91bcebea3775c8a17a115e28
FINAL_HEAD=see final handoff
POSTGRES_VERSION=NOT_RUN; CI configured postgres:17-alpine
DB_INIT=NOT_RUN
MIGRATION_BOOTSTRAP=NOT_RUN
APP_DB_ACCESS=NOT_RUN
MOCK_PIPELINE_SMOKE=NOT_RUN
PERSISTENCE_READBACK=NOT_RUN
DEDUP_CHECK=NOT_RUN
IDEMPOTENCY_CHECK=NOT_RUN
CORE_MODIFIED=false
DB_SCHEMA_CHANGED=false
MIGRATION_ADDED=false
CI_MODIFIED=true
PAID_API_CALLS=0
PRIVATE_DATA_USED=false
TESTS_RUN=test-package typecheck; CI static validation; diff check
TESTS_PASS=3 final static/type gates; 0 runtime cases executed
TESTS_FAIL=0 executed final code checks; environment probes failed as documented
ROOT_CAUSE=Cloud UID/ptrace restrictions; upstream read-only; writable public CI target missing
BLOCKERS=GitHub Actions target owner/repo
NEXT_ACTION=提供可写公开隔离 fork 的 owner/repo。
```

报告只关闭准备工作，没有关闭 runtime blocker，不自动进入 Evidence adapter / execution gate。
