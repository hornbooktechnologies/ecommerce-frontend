import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
for (const file of await readdir('public/images')) {
  if (
    !file.endsWith('.webp') ||
    file.includes('-thumb.') ||
    file.includes('-card.')
  )
    continue;
  const name = file.replace('.webp', '');
  await sharp(`public/images/${file}`)
    .resize({ width: 350, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(`public/images/${name}-thumb.webp`);
  await sharp(`public/images/${file}`)
    .resize({ width: 700, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(`public/images/${name}-card.webp`);
}
console.log('Created local thumbnail and product-card variants.');
