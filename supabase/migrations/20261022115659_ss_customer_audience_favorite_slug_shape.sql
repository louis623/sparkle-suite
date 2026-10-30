-- Tightens the favorite-array checks from
-- 20261020150000_ss_customer_audience_favorite_arrays.sql.
-- A one-element value such as {ruby,opal} matched the comma-joined slug
-- pattern, and {ruby,ruby} was allowed. This check rejects both.
-- Postgres CHECK cannot contain a subquery, so duplicates are compared
-- by array position (lists are at most 3) and a comma inside an element
-- is rejected before the slug pattern runs.
-- Adding these constraints fails if a stored row already has a duplicate
-- or a comma inside an element.

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
      AND (
        cardinality(favorite_stones) < 2
        OR (
          favorite_stones[1] IS DISTINCT FROM favorite_stones[2]
          AND (
            cardinality(favorite_stones) < 3
            OR (
              favorite_stones[1] IS DISTINCT FROM favorite_stones[3]
              AND favorite_stones[2] IS DISTINCT FROM favorite_stones[3]
            )
          )
        )
      )
      AND array_to_string(favorite_stones, '') !~ ','
      AND (
        cardinality(favorite_stones) = 0
        OR array_to_string(favorite_stones, ',') ~ '^[a-z0-9]+([_-][a-z0-9]+)*(,[a-z0-9]+([_-][a-z0-9]+)*)*$'
      )
    ),
  ADD CONSTRAINT customer_audience_favorite_materials_check
    CHECK (
      cardinality(favorite_materials) <= 3
      AND NOT (cardinality(favorite_materials) > 1 AND 'not_sure' = ANY (favorite_materials))
      AND array_position(favorite_materials, NULL) IS NULL
      AND (
        cardinality(favorite_materials) < 2
        OR (
          favorite_materials[1] IS DISTINCT FROM favorite_materials[2]
          AND (
            cardinality(favorite_materials) < 3
            OR (
              favorite_materials[1] IS DISTINCT FROM favorite_materials[3]
              AND favorite_materials[2] IS DISTINCT FROM favorite_materials[3]
            )
          )
        )
      )
      AND array_to_string(favorite_materials, '') !~ ','
      AND (
        cardinality(favorite_materials) = 0
        OR array_to_string(favorite_materials, ',') ~ '^[a-z0-9]+([_-][a-z0-9]+)*(,[a-z0-9]+([_-][a-z0-9]+)*)*$'
      )
    ),
  ADD CONSTRAINT customer_audience_favorite_cuts_check
    CHECK (
      cardinality(favorite_cuts) <= 3
      AND NOT (cardinality(favorite_cuts) > 1 AND 'not_sure' = ANY (favorite_cuts))
      AND array_position(favorite_cuts, NULL) IS NULL
      AND (
        cardinality(favorite_cuts) < 2
        OR (
          favorite_cuts[1] IS DISTINCT FROM favorite_cuts[2]
          AND (
            cardinality(favorite_cuts) < 3
            OR (
              favorite_cuts[1] IS DISTINCT FROM favorite_cuts[3]
              AND favorite_cuts[2] IS DISTINCT FROM favorite_cuts[3]
            )
          )
        )
      )
      AND array_to_string(favorite_cuts, '') !~ ','
      AND (
        cardinality(favorite_cuts) = 0
        OR array_to_string(favorite_cuts, ',') ~ '^[a-z0-9]+([_-][a-z0-9]+)*(,[a-z0-9]+([_-][a-z0-9]+)*)*$'
      )
    ),
  ADD CONSTRAINT customer_audience_favorite_collections_check
    CHECK (
      cardinality(favorite_collections) <= 3
      AND NOT (cardinality(favorite_collections) > 1 AND 'not_sure' = ANY (favorite_collections))
      AND array_position(favorite_collections, NULL) IS NULL
      AND (
        cardinality(favorite_collections) < 2
        OR (
          favorite_collections[1] IS DISTINCT FROM favorite_collections[2]
          AND (
            cardinality(favorite_collections) < 3
            OR (
              favorite_collections[1] IS DISTINCT FROM favorite_collections[3]
              AND favorite_collections[2] IS DISTINCT FROM favorite_collections[3]
            )
          )
        )
      )
      AND array_to_string(favorite_collections, '') !~ ','
      AND (
        cardinality(favorite_collections) = 0
        OR array_to_string(favorite_collections, ',') ~ '^[a-z0-9]+([_-][a-z0-9]+)*(,[a-z0-9]+([_-][a-z0-9]+)*)*$'
      )
    );

NOTIFY pgrst, 'reload schema';
