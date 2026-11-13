import {neon} from '@neondatabase/serverless';

/** All writes use row locks/unique keys in Postgres; no per-process ranking cache. */
export function createLeaderboardStore(databaseUrl, {sql: suppliedSql} = {}) {
  if (!databaseUrl && !suppliedSql) throw new Error('DATABASE_URL is not configured');
  const sql = suppliedSql || neon(databaseUrl);
  let schemaPromise;
  async function ready() {
    if (!schemaPromise) schemaPromise = sql.transaction([
      sql.query('SELECT pg_advisory_xact_lock(188619018)'),
      sql.query(`CREATE TABLE IF NOT EXISTS yesulin_arcade_sessions (
        scope text NOT NULL CHECK (scope IN ('public','verification')),
        rules_version text NOT NULL, run_id varchar(80) NOT NULL,
        nonce_hash char(64) NOT NULL, token_hash char(64) NOT NULL, resume_token text NOT NULL,
        name text NOT NULL, character text NOT NULL CHECK (character IN ('actor','director')),
        started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, entry jsonb,
        PRIMARY KEY (scope,rules_version,run_id)
      )`),
      sql.query(`CREATE TABLE IF NOT EXISTS yesulin_arcade_best (
        scope text NOT NULL CHECK (scope IN ('public','verification')), rules_version text NOT NULL,
        name text NOT NULL, run_id varchar(80) NOT NULL, bosses integer NOT NULL,
        score double precision NOT NULL, max_combo integer NOT NULL,
        created_at timestamptz NOT NULL, entry jsonb NOT NULL,
        PRIMARY KEY (scope,rules_version,name)
      )`),
      sql.query(`CREATE TABLE IF NOT EXISTS yesulin_arcade_rate (
        bucket_key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL
      )`),
      sql.query('DELETE FROM yesulin_arcade_rate WHERE expires_at < now()'),
      sql.query("DELETE FROM yesulin_arcade_sessions WHERE entry IS NULL AND started_at < now() - interval '24 hours'")
    ]).catch(error => { schemaPromise = null; throw error; });
    await schemaPromise;
  }
  return {
    ready,
    async rateLimit(key, limit, expiresAt) {
      await ready();
      const rows = await sql.query(`INSERT INTO yesulin_arcade_rate (bucket_key,hits,expires_at)
        VALUES ($1,1,$2) ON CONFLICT (bucket_key) DO UPDATE SET hits=yesulin_arcade_rate.hits+1
        RETURNING hits`, [key, expiresAt]);
      return rows[0].hits <= limit;
    },
    async startSession(input) {
      await ready();
      const rows = await sql.query(`INSERT INTO yesulin_arcade_sessions
        (scope,rules_version,run_id,nonce_hash,token_hash,resume_token,name,character)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (scope,rules_version,run_id) DO UPDATE SET run_id=EXCLUDED.run_id
        RETURNING run_id AS "runId", nonce_hash AS "nonceHash", token_hash AS "tokenHash",
          resume_token AS token, name, character, started_at AS "startedAt", entry`,
      [input.scope,input.rulesVersion,input.runId,input.nonceHash,input.tokenHash,input.token,input.name,input.character]);
      return rows[0];
    },
    async getSession({scope,rulesVersion,runId}) {
      await ready();
      const rows = await sql.query(`SELECT run_id AS "runId", token_hash AS "tokenHash", name, character,
        started_at AS "startedAt", entry FROM yesulin_arcade_sessions
        WHERE scope=$1 AND rules_version=$2 AND run_id=$3`, [scope,rulesVersion,runId]);
      return rows[0] || null;
    },
    async finishSession({scope,rulesVersion,runId,tokenHash,entry}) {
      await ready();
      // COALESCE is evaluated after the session row lock is acquired. Concurrent
      // retries always use the first accepted entry, including for the best-row upsert.
      const rows = await sql.query(`WITH accepted AS (
        UPDATE yesulin_arcade_sessions
        SET entry=COALESCE(entry,$5::jsonb), finished_at=COALESCE(finished_at,now())
        WHERE scope=$1 AND rules_version=$2 AND run_id=$3 AND token_hash=$4
        RETURNING entry
      ), best AS (
        INSERT INTO yesulin_arcade_best
          (scope,rules_version,name,run_id,bosses,score,max_combo,created_at,entry)
        SELECT $1,$2,entry->>'name',entry->>'runId',(entry->>'bosses')::integer,
          (entry->>'score')::double precision,(entry->>'maxCombo')::integer,
          (entry->>'createdAt')::timestamptz,entry FROM accepted
        ON CONFLICT (scope,rules_version,name) DO UPDATE SET
          run_id=EXCLUDED.run_id,bosses=EXCLUDED.bosses,score=EXCLUDED.score,
          max_combo=EXCLUDED.max_combo,created_at=EXCLUDED.created_at,entry=EXCLUDED.entry
        WHERE (EXCLUDED.bosses,
          CASE WHEN EXCLUDED.rules_version IN ('challenge-v20','challenge-v21','challenge-v22') AND EXCLUDED.bosses>0 THEN -(EXCLUDED.entry->>'lastClearTime')::double precision ELSE 0 END,
          EXCLUDED.score,EXCLUDED.max_combo) >
          (yesulin_arcade_best.bosses,
          CASE WHEN yesulin_arcade_best.rules_version IN ('challenge-v20','challenge-v21','challenge-v22') AND yesulin_arcade_best.bosses>0 THEN -(yesulin_arcade_best.entry->>'lastClearTime')::double precision ELSE 0 END,
          yesulin_arcade_best.score,yesulin_arcade_best.max_combo)
          OR ((EXCLUDED.bosses,
          CASE WHEN EXCLUDED.rules_version IN ('challenge-v20','challenge-v21','challenge-v22') AND EXCLUDED.bosses>0 THEN -(EXCLUDED.entry->>'lastClearTime')::double precision ELSE 0 END,
          EXCLUDED.score,EXCLUDED.max_combo) =
          (yesulin_arcade_best.bosses,
          CASE WHEN yesulin_arcade_best.rules_version IN ('challenge-v20','challenge-v21','challenge-v22') AND yesulin_arcade_best.bosses>0 THEN -(yesulin_arcade_best.entry->>'lastClearTime')::double precision ELSE 0 END,
          yesulin_arcade_best.score,yesulin_arcade_best.max_combo)
          AND (EXCLUDED.created_at,EXCLUDED.run_id) <
            (yesulin_arcade_best.created_at,yesulin_arcade_best.run_id))
        RETURNING run_id
      ) SELECT entry FROM accepted`, [scope,rulesVersion,runId,tokenHash,JSON.stringify(entry)]);
      return rows[0]?.entry || null;
    },
    async listEntries({scope,rulesVersion}) {
      await ready();
      const rows = await sql.query(`SELECT entry FROM yesulin_arcade_best
        WHERE scope=$1 AND rules_version=$2
        ORDER BY bosses DESC,
          CASE WHEN rules_version IN ('challenge-v20','challenge-v21','challenge-v22') AND bosses>0 THEN (entry->>'lastClearTime')::double precision ELSE NULL END ASC NULLS LAST,
          score DESC,max_combo DESC,created_at ASC,run_id ASC`, [scope,rulesVersion]);
      return rows.map(row => row.entry);
    }
  };
}
