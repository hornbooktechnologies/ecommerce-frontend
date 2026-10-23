import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
const url = process.env.MEILISEARCH_URL;
const key = process.env.MEILISEARCH_MASTER_KEY;
if (!url || !key)
  throw new Error(
    'Set MEILISEARCH_URL and MEILISEARCH_MASTER_KEY before running.',
  );
async function request(path, method, body) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok)
    throw new Error(`Search API ${response.status}: ${await response.text()}`);
  return response.json();
}
async function wait(task) {
  for (let i = 0; i < 300; i++) {
    const result = await request(`/tasks/${task.taskUid}`, 'GET');
    if (result.status === 'succeeded') return;
    if (result.status === 'failed' || result.status === 'canceled')
      throw new Error(JSON.stringify(result.error));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Search task timed out');
}
await wait(
  await request('/indexes/products/settings', 'PATCH', {
    searchableAttributes: ['title', 'brand', 'category', 'description'],
    filterableAttributes: [
      'categoryId',
      'brandId',
      'price',
      'rating',
      'status',
    ],
    sortableAttributes: ['price', 'rating', 'createdAt', 'popularityScore'],
  }),
);
let batch = [],
  count = 0;
for await (const line of createInterface({
  input: createReadStream('data/products.jsonl'),
  crlfDelay: Infinity,
})) {
  if (!line.trim()) continue;
  batch.push(JSON.parse(line));
  if (batch.length === 1000) {
    await wait(
      await request('/indexes/products/documents?primaryKey=id', 'POST', batch),
    );
    count += batch.length;
    batch = [];
    console.log(`Indexed ${count} products`);
  }
}
if (batch.length) {
  await wait(
    await request('/indexes/products/documents?primaryKey=id', 'POST', batch),
  );
  count += batch.length;
}
console.log(`Finished: ${count} products indexed.`);
