// Test-process guard. Never imported by the shipped application.
const original=globalThis.fetch;
globalThis.fetch=function(input,init){
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
  const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
  // Verified SQL STABLE / SELECT-only in migration
  // 20260825017000_finder_quantity_aware_availability.sql.
  const readRpc=method==='POST'&&url.pathname==='/rest/v1/rpc/list_amethyst_public_trade_board_net_v2';
  if(url.hostname.endsWith('.supabase.co')&&!['GET','HEAD','OPTIONS'].includes(method)&&!readRpc){
    console.error('QA blocked non-read database request',method,url.pathname);
    throw Error('Read-only QA: database mutations are forbidden');
  }
  return original(input,init);
};
