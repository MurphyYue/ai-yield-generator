# Day 20.1: Postgres → pgvector Container Migration

## Overview

Day 20 of the LangGraph enterprise redesign requires a long-term memory `Store` backed by `pgvector` for semantic search. The existing Docker Postgres container was built from the stock `postgres:16` image, which does not ship the `vector` extension. The extension cannot be installed at runtime — it must come from the image. This document records the in-place migration to a pgvector-enabled image with zero data loss.

---

## What Changed

| Aspect | Before | After |
|---|---|---|
| Image | `postgres:16` | `pgvector/pgvector:pg16` |
| Container name | `vault-postgres` | `vault-postgres` (recreated) |
| Volume | `vault-postgres-data` (named) | `vault-postgres-data` (same volume reused) |
| Port mapping | `5432:5432` | `5432:5432` |
| Env (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) | `vault` / `vault` / `vault` | unchanged |
| Extensions installed | `plpgsql` only | `plpgsql` + `vector 0.8.2` |
| Application data | 2 alerts, 0 conversations, LangGraph checkpoints | preserved (volume reused) |

The container's runtime config is identical except for the image. Because the data lives in a Docker **named volume** (not in the container's writable layer), removing and recreating the container is non-destructive — the new container mounts the same volume and sees the same data.

---

## Why pgvector Image vs Other Approaches

Three options were considered:

| Option | Why rejected / accepted |
|---|---|
| **Recreate with `pgvector/pgvector:pg16`** | ✅ Chosen. Single source of truth. pgvector is preinstalled. Volume reuse keeps data. |
| Install pgvector inside the running container at runtime | ❌ Rejected. The official `postgres:16` image's `apt` repos don't include `postgresql-16-pgvector`. Even if installed, the change is non-persistent — any future `docker rm` would lose it. |
| Run a fresh pgvector container on a different port alongside | ❌ Rejected. Forces split brains: app data on 5432, store data on 5433. Doubles the operational surface. |

The pgvector image is built FROM the same `postgres:16` upstream and only adds the extension binaries. There is no compatibility risk for existing data.

---

## Migration Steps Executed

```bash
# 1. Stop and remove old container (volume vault-postgres-data is preserved by Docker)
docker stop vault-postgres
docker rm vault-postgres

# 2. Pull the pgvector image
docker pull pgvector/pgvector:pg16

# 3. Recreate with same volume + env + port
docker run --name vault-postgres \
  -e POSTGRES_USER=vault \
  -e POSTGRES_PASSWORD=vault \
  -e POSTGRES_DB=vault \
  -p 5432:5432 \
  -v vault-postgres-data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg16

# 4. Wait for the cluster to be ready
docker exec vault-postgres pg_isready -U vault -d vault

# 5. Enable the extension (idempotent — IF NOT EXISTS)
docker exec vault-postgres psql -U vault -d vault \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 6. Refresh collation version (silences a benign warning, see below)
docker exec vault-postgres psql -U vault -d vault \
  -c "ALTER DATABASE vault REFRESH COLLATION VERSION;"
```

The extension is also created automatically on app boot via `setupTables()` in `frontend/lib/agent/db.ts`, so a fresh clone of the project will get pgvector enabled without manual steps.

---

## Verification

```sql
-- Extension installed
\dx
                             List of installed extensions
  Name   | Version |   Schema   |                     Description
---------+---------+------------+------------------------------------------------------
 plpgsql | 1.0     | pg_catalog | PL/pgSQL procedural language
 vector  | 0.8.2   | public     | vector data type and ivfflat and hnsw access methods

-- Existing data still accessible
SELECT COUNT(*) FROM alerts;        -- 2 (preserved)
SELECT COUNT(*) FROM conversations; -- 0 (was empty, still empty)
```

LangGraph's `PostgresSaver` checkpoint tables also survived — multi-turn conversations from before the migration continued to work after the agent rebooted.

---

## Problems Encountered & Solutions

| Problem | Cause | Solution | Lesson |
|---|---|---|---|
| First `CREATE EXTENSION vector` failed: *"extension 'vector' is not available"* | Stock `postgres:16` image does not bundle pgvector | Switched to `pgvector/pgvector:pg16` image | Postgres extensions are image-level, not runtime-installable through SQL. Plan for image choice before assuming an extension is available. |
| Collation version mismatch warning: *"database created using collation version 2.41, OS provides 2.36"* | Old container's libc had glibc 2.41; pgvector image is built on Debian Bookworm with glibc 2.36. Affects `ORDER BY` on text columns under default collation. | `ALTER DATABASE vault REFRESH COLLATION VERSION` — declares the database compatible with the new libc | Container image base-OS changes can subtly affect text sort order. Refreshing collation is a one-line fix when you know the data isn't relying on a specific collation behaviour. |

---

## Reproducibility Notes for Future Setups

If someone clones this project from scratch, they should NOT run the original `docker run` command from the Day 17 todo (which used `postgres:16`). The correct command is:

```bash
docker run --name vault-postgres \
  -e POSTGRES_USER=vault \
  -e POSTGRES_PASSWORD=vault \
  -e POSTGRES_DB=vault \
  -p 5432:5432 \
  -v vault-postgres-data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg16
```

The application's `setupTables()` runs `CREATE EXTENSION IF NOT EXISTS vector` automatically on first boot, so no further manual steps are required. `todo.md` Day 15 setup section should be updated when convenient.

---

## Why This Matters for Day 20

Day 20's `PostgresStore` requires `pgvector` to support semantic search over user memory facts (`text-embedding-3-small`, 1536 dims). Without this migration, `store.setup()` would fail when it tries to create the vector index, blocking all of Day 20.21 onward. Confirming the extension and data-preservation in isolation BEFORE wiring the application code lets us isolate failures clearly: any bug in `memory.ts` is now an application-layer bug, not an infrastructure mismatch.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/lib/agent/db.ts` | Added `CREATE EXTENSION IF NOT EXISTS vector;` to `setupTables()` so future clones don't need a manual psql step. |

No application code besides `db.ts` was touched in this step — the rest of Day 20 (memory singleton, store wiring, state expansion) is implemented in subsequent steps.
