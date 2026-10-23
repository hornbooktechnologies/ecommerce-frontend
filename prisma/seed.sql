-- Synthetic data only. Run against a dedicated development/load-test database.
-- Integer prices are in paise. Re-running does not duplicate the fixture IDs.
BEGIN;
INSERT INTO "Category" ("id", "slug", "name", "hallTheme") VALUES
 ('fashion','fashion','Fashion','linen'),
 ('electronics','electronics','Electronics','slate'),
 ('home-living','home-living','Home & Living','natural'),
 ('beauty','beauty','Beauty','blush'),
 ('sports-outdoors','sports-outdoors','Sports & Outdoors','sage'),
 ('grocery','grocery','Grocery','fresh'),
 ('kids-toys','kids-toys','Kids & Toys','playful'),
 ('books-more','books-more','Books & More','paper')
ON CONFLICT DO NOTHING;

INSERT INTO "Brand" ("id", "slug", "name")
SELECT 'brand-' || i, 'demo-brand-' || i, 'Demo Brand ' || i
FROM generate_series(0,39) AS i
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (
 "id", "slug", "title", "description", "brandId", "categoryId",
 "price", "mrp", "rating", "reviewCount", "stock", "status", "thumbUrl",
 "images", "attributes", "popularityScore", "createdAt", "updatedAt"
)
SELECT
 'seed-' || i, 'demo-product-' || i, c."name" || ' Demo Product ' || i,
 'Synthetic load-testing product. Not available for sale.',
 'brand-' || (i % 40), c."id",
 (10000 + (i::bigint * 7919) % 900000)::integer,
 round((10000 + (i::bigint * 7919) % 900000) * 1.4)::integer,
 3 + (i % 21) / 10.0, i % 500, i % 100, 'active', '',
 ARRAY[]::text[], jsonb_build_object('seed',true,'color',
 (ARRAY['olive','cream','black'])[1 + i % 3]),
 i % 1000, TIMESTAMP '2026-01-01' + (i % 270) * INTERVAL '1 day', NOW()
FROM generate_series(1,100000) AS i
JOIN "Category" c ON c."id" = (ARRAY[
 'fashion','electronics','home-living','beauty','sports-outdoors',
 'grocery','kids-toys','books-more'])[1 + (i - 1) % 8]
ON CONFLICT DO NOTHING;

INSERT INTO "ShelfRule" ("id", "hallId", "shelfId", "rule", "limit", "productIds")
SELECT 'seed-shelf-' || "id", "id", 'featured', 'bestseller', 12, ARRAY[]::text[]
FROM "Category" WHERE "id" IN ('fashion','electronics','home-living')
ON CONFLICT DO NOTHING;
COMMIT;
