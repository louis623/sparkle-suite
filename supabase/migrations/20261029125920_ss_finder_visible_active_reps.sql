-- Louis 2026-10-29: every active rep gets a Sparkle Finder card. Rocky PASS.
-- Rollback: UPDATE public.reps SET finder_directory_visible = false WHERE id IN ('2b5a27c5-9c05-4014-8d0b-754e19815bf6','43fc5fb5-205f-40cd-a42e-a36099411f19','1b8be17b-cc4f-458b-8c11-cc097be4fba3','f82734fd-6964-42c7-b67d-c2445528c3b4');
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.reps SET finder_directory_visible = true
  WHERE id IN ('2b5a27c5-9c05-4014-8d0b-754e19815bf6','43fc5fb5-205f-40cd-a42e-a36099411f19','1b8be17b-cc4f-458b-8c11-cc097be4fba3','f82734fd-6964-42c7-b67d-c2445528c3b4')
    AND public_site_slug IN ('brisglowtique','brittwithbling','goforthebling','milehighfizz')
    AND status = 'active' AND account_classification = 'customer';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN
    RAISE EXCEPTION 'Expected 4 reps updated, got %', n;
  END IF;
END $$;
