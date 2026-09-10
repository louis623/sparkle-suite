-- Nic-Nac is a first-class, auditable in-app Message Center sender. The
-- Control Center route admits only this key or the owner key; it never
-- accepts arbitrary browser-supplied sender identities.
INSERT INTO public.workspace_message_senders (
  sender_key,
  display_name,
  sender_type,
  capabilities,
  is_active
)
VALUES (
  'nic_nac',
  'Nic-Nac',
  'agent',
  '{"categories":["business_update","platform_update","help_update","announcement"],"audiences":["all_active","selected"]}'::jsonb,
  true
)
ON CONFLICT (sender_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  sender_type = EXCLUDED.sender_type,
  capabilities = EXCLUDED.capabilities,
  is_active = true,
  updated_at = now();
