# Brazil knowledge portal

Activated 2026-10-24 at https://www.polovinka.work/life/brazil and /life/brazil/chat.

Production deployment: dpl_13PsKrRY7nrJZ52Mih3jd9DgPBnJ. Supabase project: txnewssimaetkrpfwdrq. Source chats: Brazil_ChatForum and brfloripa. Initial import: 87,724 messages and 2,111 indexed notes. First incremental run: 87,730 messages and 2,115 notes, no pending messages. First daily selection: 2026-10-23, 218 source messages, three questions.

Daily cron: 03:17 UTC, retries at 03:32 and 03:47 (00:17 São Paulo / 11:17 Bali). Existing Intercom and Assessor cron definitions preserved. Legacy Life Telegram digest remains disabled; this feature sends no Telegram messages.

Life authentication protects pages and chat. Cloud tables are server-only with RLS and service role grants. Secrets stay in server environment. Model calls use store=false. Shared SQL budget reservations cap this feature at USD 3 per UTC calendar month, including chat, indexing and daily analysis. Unknown API outcomes retain their reservation. The limit excludes unrelated API usage and infrastructure billing.

Recovery: call authenticated GET /api/cron/brazil; it resumes saved cursors and unfinished analysis. Do not reset cursors or bootstrap metadata. Monitor brazil_state.last_error and brazil_ai_usage. Budget exhaustion retains collection and delays analysis. Import script is idempotent after bootstrap.

Validation: 15 Node tests passed, TypeScript and Next production builds passed, authenticated production chat returned cited answers, unauthenticated API rejected access. Daily job completed and repeat calls completed without regenerating the saved selection.

## Recovery, 2026-11-03

The 2026-10-29 Git deployment lacked this formerly uncommitted portal. Restore the complete portal source, chat API, assets and Brazil cron through a committed Git deployment. Preserve Assessor and the disabled Life digest. Intercom is now independently deployed in pg-intercom-pulse and must not be added to this website. Deployment-manifest verification runs before every production build to catch missing Brazil routes/navigation or dropped schedules. GitHub checks run the committed test suite and build. Do not rely on uncommitted CLI deployments.

Source review before Git recovery: brazil-family.ts is a directory of publicly listed schools, hospitals and children's venues with official source URLs, not records of the owner's family. brazil-rental-evidence.json contains advertised market samples from linked public listing portals, not the owner's residence or tenancy. Static planning content is generic guidance, without personal documents, birth dates or medical records. Private chat messages and extracted participant notes stay in service-only Supabase tables and are fetched only behind Life authentication. No export directories, session files or environment files are staged; a scan of staged blobs found no current credential values.
