-- CJW-02 Christmas Jewelry Workshop becomes a Community theme, set the same way
-- as Silver Bells (community, no owner, internal demo off). Catalog row only:
-- no rep's saved theme is read or changed.
DO $cjw$
DECLARE
  changed integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.amethyst_skin_catalog
     WHERE skin_id = 'christmas_jewelry_workshop'
       AND visibility = 'community' AND owner_rep_id IS NULL AND allow_internal_demo = false
  ) THEN
    RETURN;
  END IF;

  UPDATE public.amethyst_skin_catalog
     SET visibility = 'community', owner_rep_id = NULL, allow_internal_demo = false
   WHERE skin_id = 'christmas_jewelry_workshop'
     AND visibility = 'private'
     AND owner_rep_id = 'ac3e643a-6ccf-4400-8230-662f63a07f3e'::uuid
     AND allow_internal_demo = false;
  GET DIAGNOSTICS changed = ROW_COUNT;

  IF changed <> 1 THEN
    RAISE EXCEPTION 'Christmas Jewelry Workshop catalog row is not in the expected Fizz Fest private state; review before applying';
  END IF;
END;
$cjw$;
