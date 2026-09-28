import type { PGlite } from '@electric-sql/pglite'
import type { SupabaseClient } from '@supabase/supabase-js'

// Synthetic single-connection transport adapter. No hosted client or network.
export function lineupSqlAdapter(sql: PGlite): SupabaseClient {
  const identifier = (value: string) => {
    if (!/^[a-z_]+$/.test(value)) throw new Error('Unsafe fixture identifier')
    return `"${value}"`
  }
  const normalize = (value: unknown) => JSON.parse(JSON.stringify(value))
  class Query {
    fields = '*'; filters: [string, unknown][] = []; maximum = 1000; single = false
    values: Record<string, unknown> | null = null; sort: string | null = null; ascending = true
    constructor(readonly table: string) {
      if (!['live_lineup_states', 'live_lineup_publisher_tokens', 'live_queue'].includes(table)) throw new Error('Unexpected table')
    }
    select(fields: string) { this.fields = fields.split(',').map(identifier).join(','); return this }
    eq(key: string, value: unknown) { this.filters.push([identifier(key), value]); return this }
    limit(n: number) { this.maximum = n; return this }
    maybeSingle() { this.single = true; return this }
    order(key: string, options: {ascending: boolean}) { this.sort = identifier(key); this.ascending = options.ascending; return this }
    insert(values: Record<string, unknown>) { this.values = values; return this }
    async run() {
      try {
        if (this.values) {
          const entries = Object.entries(this.values)
          await sql.query(`insert into ${identifier(this.table)} (${entries.map(([key]) => identifier(key)).join(',')}) values (${entries.map((_, i) => `$${i + 1}`).join(',')})`, entries.map(([, value]) => value))
          return {data: null, error: null}
        }
        const result = await sql.query(`select ${this.fields} from ${identifier(this.table)}${this.filters.length ? ' where ' + this.filters.map(([key], i) => `${key}=$${i + 1}`).join(' and ') : ''}${this.sort ? ` order by ${this.sort} ${this.ascending ? 'asc' : 'desc'}` : ''} limit ${this.maximum}`, this.filters.map(([, value]) => value))
        if (this.single && result.rows.length > 1) throw new Error('Nonunique fixture read')
        return {data: normalize(this.single ? result.rows[0] ?? null : result.rows), error: null}
      } catch (error) { return {data: null, error} }
    }
    then(resolve: (result: unknown) => unknown, reject?: (error: unknown) => unknown) { return this.run().then(resolve, reject) }
  }
  return {
    from: (table: string) => new Query(table),
    rpc: async (name: string, args: Record<string, unknown>) => {
      const contracts: Record<string, string[]> = {
        live_lineup_compare_swap: ['p_rep_id','p_expected_revision','p_state','p_token_id'],
        live_lineup_commit: ['p_rep_id','p_expected_revision','p_state','p_token_id','p_guard'],
        live_lineup_claim_receipt: ['p_rep_id','p_token_id','p_claim_id'],
        live_lineup_issue_publisher: ['p_rep_id','p_token_id','p_token_hash','p_label'],
        live_lineup_list_publishers: ['p_rep_id'],
        live_lineup_revoke_publisher: ['p_rep_id','p_token_id'],
      }
      const keys = contracts[name]
      if (!keys || Object.keys(args).length !== keys.length) throw new Error('Unexpected RPC contract')
      try {
        const result = await sql.query(`select * from ${identifier(name)}(${keys.map((_, i) => `$${i + 1}`).join(',')})`, keys.map(key => key === 'p_state' || key === 'p_guard' ? JSON.stringify(args[key]) : args[key]))
        return {data: normalize(result.rows), error: null}
      } catch (error) { return {data: null, error} }
    },
  } as unknown as SupabaseClient
}
