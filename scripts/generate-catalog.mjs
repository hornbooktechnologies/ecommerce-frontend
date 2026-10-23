import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { once } from 'node:events';
const count = Number(process.argv[2] || 100000);
if (!Number.isSafeInteger(count) || count < 1 || count > 1000000)
  throw new Error('Use a product count from 1 to 1,000,000');
await mkdir('data', { recursive: true });
const output = createWriteStream('data/products.jsonl');
const categories = [
  'Fashion',
  'Electronics',
  'Home & Living',
  'Beauty',
  'Sports & Outdoors',
  'Grocery',
  'Kids & Toys',
  'Books & More',
];
for (let i = 1; i <= count; i++) {
  const category = categories[(i - 1) % 8];
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const price = 10000 + ((i * 7919) % 900000);
  const product = {
    id: `seed-${i}`,
    slug: `${categorySlug}-product-${i}`,
    title: `${category} Demo Product ${i}`,
    description: 'Synthetic load-testing product. Not available for sale.',
    brandId: `brand-${i % 40}`,
    categoryId: categorySlug,
    category,
    brand: `Demo Brand ${i % 40}`,
    price,
    mrp: Math.round(price * 1.4),
    rating: 3 + (i % 21) / 10,
    reviewCount: i % 500,
    stock: i % 100,
    status: 'active',
    thumbUrl: '',
    images: [],
    attributes: { seed: true, color: ['olive', 'cream', 'black'][i % 3] },
    popularityScore: i % 1000,
    createdAt: new Date(2026, 0, 1 + (i % 270)).toISOString(),
  };
  if (!output.write(JSON.stringify(product) + '\n'))
    await once(output, 'drain');
}
output.end();
await once(output, 'finish');
console.log(
  `Generated ${count.toLocaleString()} synthetic products in data/products.jsonl (prices in paise).`,
);
