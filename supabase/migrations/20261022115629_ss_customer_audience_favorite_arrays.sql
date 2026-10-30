-- Customer jewelry favorites, stored the same way Sparkle Finder stores them
-- on sparkle_finder_profiles: text[] of slugs, at most 3 per list.
-- Finder API names are favoriteStones, favoriteMaterials, favoriteCuts,
-- and favoriteCollections. Slug membership stays in the sign-up API so
-- retiring an option never invalidates an older row. not_sure stands alone.
-- Postgres does not allow subqueries in CHECK, so the slug format is checked
-- on the comma-joined array instead (slugs never contain commas).

ALTER TABLE public.customer_audience
  ADD COLUMN IF NOT EXISTS favorite_stones text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS favorite_materials text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS favorite_cuts text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS favorite_collections text[] NOT NULL DEFAULT '{}';

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

COMMENT ON COLUMN public.customer_audience.favorite_stones IS
  'Up to 3 favorite stone slugs, matching Finder favorite_stones. not_sure cannot be combined with another pick.';
COMMENT ON COLUMN public.customer_audience.favorite_materials IS
  'Up to 3 favorite material slugs, matching Finder favorite_materials. not_sure cannot be combined with another pick.';
COMMENT ON COLUMN public.customer_audience.favorite_cuts IS
  'Up to 3 favorite cut slugs, matching Finder favorite_cuts. not_sure cannot be combined with another pick.';
COMMENT ON COLUMN public.customer_audience.favorite_collections IS
  'Up to 3 favorite collection slugs, matching Finder favorite_collections. not_sure cannot be combined with another pick.';

NOTIFY pgrst, 'reload schema';
