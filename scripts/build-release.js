'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (entry === 'runtime-db.json') continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const items = ['index.html', 'prototype.html', 'css', 'js', 'src', 'data', 'docs', 'README.md'];
for (const item of items) {
  const srcPath = path.join(ROOT, item);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, path.join(DIST, item));
  }
}

fs.writeFileSync(path.join(DIST, '.nojekyll'), '', 'utf8');
fs.writeFileSync(
  path.join(DIST, 'release-manifest.json'),
  JSON.stringify(
    {
      projectCode: 'P11',
      version: '1.0.0',
      builtAt: new Date().toISOString(),
      student: "Temirov Dilshod Dilmurod o'g'li"
    },
    null,
    2
  ),
  'utf8'
);

console.log('[OK] Reliz paketi dist/ katalogiga muvaffaqiyatli yig\'ildi.');
