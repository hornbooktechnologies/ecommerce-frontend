import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/fonts', { recursive: true });
const request = await fetch(
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400..700&family=Manrope:wght@400..800&display=swap',
  {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  },
);
if (!request.ok) throw new Error(`Font styles ${request.status}`);
const css = await request.text();
let localCss = '';
let i = 0;
for (const match of css.matchAll(
  /\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g,
)) {
  const block = match[1];
  const url = block.match(/url\(([^)]+)\)/)?.[1];
  if (!url) continue;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font download ${response.status}`);
  const name = `aura-${i++}.woff2`;
  await writeFile(
    `public/fonts/${name}`,
    Buffer.from(await response.arrayBuffer()),
  );
  localCss += block.replace(url, `/fonts/${name}`) + '\n';
}
if (i !== 2)
  throw new Error(`Expected two Latin variable fonts, received ${i}`);
await writeFile('public/fonts/fonts.css', localCss);
console.log('Saved two variable fonts for local hosting.');
