import { PGlite } from '@electric-sql/pglite'
import type { SupabaseClient } from '@supabase/supabase-js'

// Local PostgreSQL transport for real application persistence/services. No hosted
// credentials, network, model, storage or real rep. Unknown SQL fails the test.
export async function createChatDatabase() {
  const sql = new PGlite()
  await sql.exec(`create table nic_nac_conversations (
    id uuid primary key default gen_random_uuid(), rep_id text not null,
    conversation_id text not null, message_id text not null, role text not null,
    parts jsonb not null default '[]', status text not null default 'complete',
    created_at timestamptz not null default now(), updated_at timestamptz default now(), cleared_at timestamptz,
    unique(conversation_id, message_id)
  );`)
  return { sql, client: sqlClient(sql) }
}

export function sqlClient(sql: PGlite): SupabaseClient {
  const ident = (key: string) => {
    if (!/^[a-z_][a-z_0-9]*$/i.test(key)) throw new Error(`Unsupported SQL identifier: ${key}`)
    return `"${key}"`
  }
  class Query {
    fields = '*'; conditions: string[] = []; params: unknown[] = []
    sorts: string[] = []; count = 10000; offset = 0; one = false
    operation = 'select'; values: Record<string, unknown>[] = []; conflict = ''; ignore = false
    constructor(readonly table: string) {}
    bind(value: unknown) { this.params.push(value && typeof value === 'object' ? JSON.stringify(value) : value); return `$${this.params.length}` }
    select(fields = '*') { this.fields = fields; return this }
    eq(k: string, v: unknown) { this.conditions.push(`${ident(k)} = ${this.bind(v)}`); return this }
    neq(k: string, v: unknown) { this.conditions.push(`${ident(k)} <> ${this.bind(v)}`); return this }
    is(k: string, v: unknown) { if (v !== null) throw new Error('unsupported is'); this.conditions.push(`${ident(k)} is null`); return this }
    in(k: string, v: unknown[]) { this.conditions.push(v.length ? `${ident(k)} in (${v.map(x => this.bind(x)).join(',')})` : 'false'); return this }
    gt(k: string, v: unknown) { this.conditions.push(`${ident(k)} > ${this.bind(v)}`); return this }
    gte(k: string, v: unknown) { this.conditions.push(`${ident(k)} >= ${this.bind(v)}`); return this }
    lt(k: string, v: unknown) { this.conditions.push(`${ident(k)} < ${this.bind(v)}`); return this }
    lte(k: string, v: unknown) { this.conditions.push(`${ident(k)} <= ${this.bind(v)}`); return this }
    ilike(k: string, v: unknown) { this.conditions.push(`${ident(k)} ilike ${this.bind(v)}`); return this }
    order(k: string, o?: { ascending?: boolean }) { this.sorts.push(`${ident(k)} ${o?.ascending === false ? 'desc' : 'asc'}`); return this }
    limit(n: number) { this.count = n; return this }
    range(a: number, b: number) { this.offset = a; this.count = b-a+1; return this }
    maybeSingle() { this.one = true; return this }
    single() { this.one = true; return this }
    insert(v: Record<string, unknown> | Record<string, unknown>[]) { this.operation='insert'; this.values=Array.isArray(v)?v:[v]; return this }
    upsert(v: Record<string, unknown> | Record<string, unknown>[], o?: { onConflict?: string; ignoreDuplicates?: boolean }) {
      this.insert(v); this.conflict=o?.onConflict ?? 'id'; this.ignore=o?.ignoreDuplicates === true; return this
    }
    update(v: Record<string, unknown>) { this.operation='update'; this.values=[v]; return this }
    delete() { this.operation='delete'; return this }
    async run() {
      try {
        const where = this.conditions.length ? ` where ${this.conditions.join(' and ')}` : ''
        let query: string
        if (this.operation === 'insert') {
          const keys=Object.keys(this.values[0]);
          query=`insert into ${ident(this.table)} (${keys.map(ident).join(',')}) values ${this.values.map(row=>`(${keys.map(k=>this.bind(row[k] ?? null)).join(',')})`).join(',')}`
          if(this.conflict) query+=` on conflict (${this.conflict.split(',').map(ident).join(',')}) do `+(this.ignore?'nothing':`update set ${keys.map(k=>`${ident(k)}=excluded.${ident(k)}`).join(',')}`)
          query+=' returning *'
        } else if (this.operation === 'update') {
          query=`update ${ident(this.table)} set ${Object.entries(this.values[0]).map(([k,v])=>`${ident(k)}=${this.bind(v)}`).join(',')}${where} returning *`
        } else if (this.operation === 'delete') query=`delete from ${ident(this.table)}${where} returning *`
        else query=`select ${this.fields === '*' ? '*' : this.fields.split(',').map(k=>ident(k.trim())).join(',')} from ${ident(this.table)}${where}${this.sorts.length ? ` order by ${this.sorts.join(',')}` : ''} limit ${this.count} offset ${this.offset}`
        const result=await sql.query(query,this.params)
        if(this.one && result.rows.length>1) throw new Error('Expected single row')
        return {data:JSON.parse(JSON.stringify(this.one ? result.rows[0] ?? null : result.rows)),error:null}
      } catch(error) { return {data:null,error} }
    }
    then(resolve: (r: unknown)=>unknown, reject?: (e: unknown)=>unknown) {return this.run().then(resolve,reject)}
  }
  return {from:(table:string)=>new Query(table)} as unknown as SupabaseClient
}
