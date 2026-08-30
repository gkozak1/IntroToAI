import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8').trim();
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8')
  .replace("const MOCK_MODE = PAGE_PARAMS.get('mock') === '1';", 'const MOCK_MODE = true;')
  .trim();

const simulation = index
  .replace(/\s*<link rel="stylesheet" href="\.\/styles\.css\?v=[^"]+" \/>/, `\n  <style>\n${css}\n  </style>`)
  .replace(/\s*<script type="module" src="\.\/app\.js\?v=[^"]+"><\/script>/, `\n  <script>\n${app}\n  </script>`);

fs.writeFileSync(path.join(root, 'simulation.html'), simulation);
console.log('Built simulation.html from index.html, styles.css, and app.js');
