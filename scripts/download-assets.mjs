import { mkdir, writeFile } from 'node:fs/promises';
const ids = [
  'photo-1483985988355-763728e1935b',
  'photo-1505740420928-5e560c06d30e',
  'photo-1616486338812-3dadae4b4ace',
  'photo-1608571423902-eed4a5ad8108',
  'photo-1517649763962-0c623066013b',
  'photo-1542838132-92c53300491e',
  'photo-1558060370-d644479cb6f7',
  'photo-1495446815901-a7297e633e8d',
  'photo-1542291026-7eec264c27ff',
  'photo-1598300042247-d088f8ab3a91',
  'photo-1553062407-98eeb64c6a62',
  'photo-1490312278390-ab64016e0aa9',
  'photo-1534528741775-53994a69daeb',
  'photo-1506794778202-cad84cf45f1d',
  'photo-1500648767791-00dcc994a43e',
  'photo-1600210492486-724fe5c67fb0',
];
await mkdir('public/images', { recursive: true });
for (let i = 0; i < ids.length; i += 4) {
  await Promise.all(
    ids.slice(i, i + 4).map(async (id) => {
      const width = id === 'photo-1600210492486-724fe5c67fb0' ? 1500 : 700;
      const response = await fetch(
        `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85&fm=webp`,
      );
      if (!response.ok) throw new Error(`${id}: ${response.status}`);
      await writeFile(
        `public/images/${id}.webp`,
        Buffer.from(await response.arrayBuffer()),
      );
      console.log(`Saved ${id}`);
    }),
  );
}
