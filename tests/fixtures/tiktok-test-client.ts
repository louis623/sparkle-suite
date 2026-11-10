import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

export function tiktokTestClient(tables: Record<string, unknown> = {}, rpcResults: Record<string, unknown> = {}) {
  const bucket = {
    download: vi.fn(), upload: vi.fn().mockResolvedValue({data:{},error:null}),
    remove: vi.fn().mockResolvedValue({data:[],error:null}),
    createSignedUploadUrl: vi.fn().mockResolvedValue({data:{token:'signed'},error:null}),
    getPublicUrl: vi.fn((path: string) => ({data:{publicUrl:`https://fixture.supabase.co/${path}`}})),
  }
  const queries: Array<{table:string;operation:string;args:unknown[]}> = []
  const api = {
    rpc: vi.fn(async (name: string) => ({data:rpcResults[name],error:null})),
    storage: { from: vi.fn(() => bucket) },
    from: vi.fn((table: string) => {
      const response = () => ({ data: tables[table] ?? [], error:null })
      const chain: Record<string, unknown> = {}
      for (const operation of ['select','eq','neq','in','is','not','lt','order','limit','insert','update','delete']) {
        chain[operation] = vi.fn((...args: unknown[]) => { queries.push({table,operation,args}); return chain })
      }
      chain.single = vi.fn(async () => response())
      chain.maybeSingle = vi.fn(async () => response())
      chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(response()).then(resolve)
      return chain
    }),
  }
  return { client: api as unknown as SupabaseClient, api, bucket, queries }
}
