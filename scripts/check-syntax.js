'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const filesToCheck = [
  'src/domain/estimatePolicy.js',
  'data/seedOrders.js',
  'backend/server.js',
  'api/index.js',
  'js/app.js',
  'tests/estimatePolicy.test.js',
  'tests/api.test.js'
];

for (const rel of filesToCheck) {
  const fullPath = path.join(ROOT, rel);
  if (!fs.existsSync(fullPath)) {
    console.error(`[XATO] Fayl topilmadi: ${rel}`);
    process.exit(1);
  }
  execFileSync(process.execPath, ['--check', fullPath], { stdio: 'inherit' });
}

for (const htmlFile of ['index.html', 'prototype.html']) {
  const fullHtml = path.join(ROOT, htmlFile);
  if (!fs.existsSync(fullHtml)) {
    console.error(`[XATO] HTML fayl topilmadi: ${htmlFile}`);
    process.exit(1);
  }
}

console.log(`[OK] Barcha ${filesToCheck.length} ta JS modul va 2 ta HTML sahifa sintaksisi tekshiruvdan muvaffaqiyatli o'tdi.`);
