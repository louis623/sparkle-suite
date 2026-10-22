-- Undo for supabase/migrations/20261020235500_ss_customer_audience_favorite_slug_shape.sql.
-- Restores the favorite-array checks from
-- 20261020150000_ss_customer_audience_favorite_arrays.sql.
-- Does not delete favorite values.
-- Run this before supabase/manual/20261020150200_ss_customer_audience_jewelry_preferences_undo.sql
-- when rolling the preference columns back. That later undo deletes collected data
-- and must run only after an app rollback.

ALTER TABLE public.customer_audience
  DROP CONSTRAINT IF EXISTS customer_audience_favorite_stones_check,
  DROP CONSTRAINT IF EXISTS customer_audience_favorite_materials_check,
  DROP CONSTRAINT IF EXISTS customer_audience_favorite_cuts_check,
  DROP CONSTRAINT IF EXISTS customer_audience_favorite_collections_check;

ALTER TABLE public.customer_audience
  ADD CONSTRAINT customer_audience_favorite_stones_check
    CHECK (
      cardinality(favorite_stones) <= 3
      AND NOT (cardinality(favorite_stones) > 1 AND 'not_sure' = ANY (favorite_stones))
      AND array_position(favorite_stones, NULL) IS NULL
      AND (cardinality(favorite_stones) = 0
        OR array_to_string(favorite_stones, ',') ~ '^[a-z0-9]+([_-][a-z0-9]+)*(,[a-z0-9]+([_-][a-z0-9]+)*)*$')
    ),
  ADD CONSTRAINT customer_audience_favorite_materials_check
    CHECK (
      cardinality(favorite_materials) <= 3
      AND NOT (cardinality(favorite_materials) > 1 AND 'not_sure' = ANY (favorite_materials))
      AND array_position(favorite_materials, NULL) IS NULL
      AND (cardinality(favorite_materials) = 0
        OR array_to_string(favorite_materials, ',') ~ '^[a-z0-9]+([_-][a-z0-9]+)*(,[a-z0-9]+([_-][a-z0-9]+)*)*$')
    ),
  ADD CONSTRAINT customer_audience_favorite_cuts_check
    CHECK (
      cardinality(favorite_cuts) <= 3
      AND NOT (cardinality(favorite_cuts) > 1 AND 'not_sure' = ANY (favorite_cuts))
      AND array_position(favorite_cuts, NULL) IS NULL
      AND (cardinality(favorite_cuts) = 0
        OR array_to_string(favorite_cuts, ',') ~ '^[a-z0-9]+([_-][a-z0-9]+)*(,[a-z0-9]+([_-][a-z0-9]+)*)*$')
    ),
  ADD CONSTRAINT customer_audience_favorite_collections_check
    CHECK (
      cardinality(favorite_collections) <= 3
      AND NOT (cardinality(favorite_collections) > 1 AND 'not_sure' = ANY (favorite_collections))
      AND array_position(favorite_collections, NULL) IS NULL
      AND (cardinality(favorite_collections) = 0
        OR array_to_string(favorite_collections, ',') ~ '^[a-z0-9]+([_-][a-z0-9]+)*(,[a-z0-9]+([_-][a-z0-9]+)*)*$')
    );

NOTIFY pgrst, 'reload schema';
