import fs from 'node:fs';
import path from 'node:path';

const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;

const analyze = () => {
  const chunksDir = path.join(process.cwd(), '.next', 'static', 'chunks');
  if (!fs.existsSync(chunksDir)) {
    console.error('No build artifacts found. Run `npm run build` first.');
    process.exitCode = 1;
    return;
  }

  const rows = fs
    .readdirSync(chunksDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      const absolute = path.join(chunksDir, file);
      return { file, size: fs.statSync(absolute).size };
    })
    .sort((a, b) => b.size - a.size);

  console.log('\nTop JS chunks by size');
  console.log('='.repeat(72));
  rows.slice(0, 15).forEach((row) => {
    console.log(`${row.file.padEnd(56)} ${formatKb(row.size)}`);
  });
  console.log('='.repeat(72));

  const totalBytes = rows.reduce((sum, row) => sum + row.size, 0);
  console.log(`Total JS in .next/static/chunks: ${formatKb(totalBytes)}\n`);
};

analyze();
