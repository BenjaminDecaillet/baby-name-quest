// Runs after `vite build`: GitHub Pages serves `404.html` for unknown paths,
// so a copy of the SPA entry point lets deep links (/liste, /matchs) work.
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const index = path.join(dist, 'index.html');
if (!existsSync(index)) {
  console.error('postbuild: dist/index.html not found, run `vite build` first');
  process.exit(1);
}
copyFileSync(index, path.join(dist, '404.html'));
console.log('postbuild: dist/404.html written');
