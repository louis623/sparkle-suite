/** Search both current displayed profiles and historical rep identity, before paging. */
export function operatorCustomerSearch(value: unknown) {
  const term = typeof value === 'string' ? value.trim().slice(0, 240) : ''
  if (!term) return null
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const quoted = '"' + pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  const fields = (names: string[]) => names.map(field => field + '.imatch.' + quoted).join(',')
  return {
    select: 'search_profile:client_account_profiles!client_account_profiles_rep_id_fkey(id)',
    profileFilter: fields(['client_name', 'show_name', 'primary_contact_name', 'email']),
    repFilter: fields(['business_name', 'display_name', 'email']) + ',search_profile.not.is.null',
  }
}
