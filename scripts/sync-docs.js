#!/usr/bin/env node
/**
 * sync-docs.js — copia selectiva frontend/ → docs/
 *
 * Copia solo los archivos web publicables (HTML, JS, assets).
 * NO toca los archivos .md de docs/ (documentación, esquemas, notas).
 * Idempotente: solo sobreescribe si el contenido cambió.
 *
 * Uso: node scripts/sync-docs.js
 *      npm run sync
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'frontend');
const DST  = path.join(ROOT, 'docs');

// Archivos individuales a sincronizar (rutas relativas a SRC/DST)
const FILES = [
  'index.html',
  'api-client.js',
];

// Directorios a sincronizar recursivamente (SRC → DST)
const DIRS = [
  'js',
  'assets',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sameContent(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  const sA = fs.statSync(a).size;
  const sB = fs.statSync(b).size;
  if (sA !== sB) return false;
  return fs.readFileSync(a).equals(fs.readFileSync(b));
}

function copyFile(srcPath, dstPath) {
  const dir = path.dirname(dstPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (sameContent(srcPath, dstPath)) {
    console.log('  = ' + path.relative(ROOT, srcPath) + ' (sin cambios)');
    return false;
  }
  fs.copyFileSync(srcPath, dstPath);
  console.log('  ✓ ' + path.relative(ROOT, srcPath));
  return true;
}

function copyDir(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn('  ⚠ Dir no encontrado: ' + path.relative(ROOT, srcDir));
    return 0;
  }
  fs.mkdirSync(dstDir, { recursive: true });
  let changed = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      changed += copyDir(s, d);
    } else {
      if (copyFile(s, d)) changed++;
    }
  }
  return changed;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('\n─── PilotPay sync-docs: frontend/ → docs/ ───\n');

let totalChanged = 0;

for (const file of FILES) {
  const srcPath = path.join(SRC, file);
  if (!fs.existsSync(srcPath)) {
    console.warn('  ⚠ Archivo no encontrado: frontend/' + file);
    continue;
  }
  if (copyFile(srcPath, path.join(DST, file))) totalChanged++;
}

for (const dir of DIRS) {
  totalChanged += copyDir(path.join(SRC, dir), path.join(DST, dir));
}

console.log('\n─────────────────────────────────────────────');
if (totalChanged === 0) {
  console.log('✓ docs/ ya estaba sincronizado — nada que actualizar.\n');
} else {
  console.log('✓ Sincronizados ' + totalChanged + ' archivo(s). docs/ listo para commit.\n');
  console.log('  Siguiente paso:');
  console.log('    git add docs/');
  console.log('    git commit -m "deploy: sync docs/ con frontend/"');
  console.log('    git push\n');
}
