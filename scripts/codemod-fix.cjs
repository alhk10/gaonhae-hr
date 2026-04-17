#!/usr/bin/env node
/**
 * Repair the broken imports & toLocaleDateString rewrites left by codemod-date-format.cjs.
 *
 * Fixes:
 *  1) `import {` followed on the next line by `import { formatDate ... } from '@/utils/dateFormat';`
 *     -> hoist the helper import above the broken multi-line import.
 *  2) Local `const formatDate = (dateString...) => { formatDate( return new Date(dateString));`
 *     -> remove the now-redundant local helper entirely (the imported one supersedes it).
 *  3) Any `formatDate(\n    return EXPR);` artifact -> `formatDate(EXPR);`.
 *  4) Inline `formatDate( EXPR ).toLocaleDateString(...)` survivor -> already covered by (3).
 *
 * Also: rename pre-existing local `const formatDate = ...` that conflict with the import
 * by removing the local definition (since callers now use the imported helper).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(ent.name)) files.push(full);
  }
  return files;
}

function fix(src, file) {
  let changed = false;
  let s = src;

  // Fix 1: broken multi-line import injection.
  // Pattern: a line ending with `import {` (only that on the line), immediately followed by
  // `import { ... } from '@/utils/dateFormat';`
  const importBreakRe = /^(\s*import\s*\{\s*)\n(\s*import\s*\{[^}]*\}\s*from\s*['"]@\/utils\/dateFormat['"]\s*;?\s*)\n/m;
  while (importBreakRe.test(s)) {
    s = s.replace(importBreakRe, (_m, openLine, helperImport) => {
      changed = true;
      return `${helperImport.trimEnd()}\n${openLine}\n`;
    });
  }

  // Fix 2: removed local formatDate definitions that look like:
  //   const formatDate = (dateString: string) => {formatDate(
  //     return new Date(dateString));
  //   };
  // (or with .toLocaleDateString remnants)
  const localBrokenRe = /\n\s*const\s+formatDate\s*=\s*\([^)]*\)\s*=>\s*\{\s*formatDate\([\s\S]*?\}\s*;\s*\n/g;
  if (localBrokenRe.test(s)) {
    s = s.replace(localBrokenRe, '\n');
    changed = true;
  }

  // Fix 3: any other "formatDate(\n    return EXPR);" artifact (no preceding const).
  const returnArtifact = /formatDate\(\s*\n(\s*)return\s+([^;]+);\s*\n/g;
  if (returnArtifact.test(s)) {
    s = s.replace(returnArtifact, (_m, indent, expr) => {
      changed = true;
      return `${indent}return formatDate(${expr.trim()});\n`;
    });
  }

  // Fix 3b: same for formatDateTime
  const returnArtifact2 = /formatDateTime\(\s*\n(\s*)return\s+([^;]+);\s*\n/g;
  if (returnArtifact2.test(s)) {
    s = s.replace(returnArtifact2, (_m, indent, expr) => {
      changed = true;
      return `${indent}return formatDateTime(${expr.trim()});\n`;
    });
  }

  // Fix 4: leftover local declarations that just call the new helper, e.g.
  //   const formatDate = (dateString: string) => { return formatDate(new Date(dateString)); };
  // These would cause infinite recursion / shadowing — drop them.
  const recursiveLocal = /\n\s*const\s+formatDate\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*return\s+formatDate\([^}]*\}\s*;?\s*\n/g;
  if (recursiveLocal.test(s)) {
    s = s.replace(recursiveLocal, '\n');
    changed = true;
  }
  const recursiveLocal2 = /\n\s*const\s+formatDateTime\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*return\s+formatDateTime\([^}]*\}\s*;?\s*\n/g;
  if (recursiveLocal2.test(s)) {
    s = s.replace(recursiveLocal2, '\n');
    changed = true;
  }

  // Fix 5: removed obsolete `format` import if no longer used in the file.
  if (changed || /from ['"]@\/utils\/dateFormat['"]/.test(s)) {
    // strip lone `format` from `import { format, ... } from 'date-fns'`
    const dateFnsImport = /import\s*\{([^}]+)\}\s*from\s*['"]date-fns['"]\s*;?/;
    const m = s.match(dateFnsImport);
    if (m) {
      const names = m[1].split(',').map(x => x.trim()).filter(Boolean);
      // keep `format` only if used outside imports
      const bodyWithoutImports = s.replace(/import[^;]+;/g, '');
      const filtered = names.filter(n => {
        if (n !== 'format') return true;
        return new RegExp(`\\bformat\\s*\\(`).test(bodyWithoutImports);
      });
      if (filtered.length !== names.length) {
        if (filtered.length === 0) {
          s = s.replace(dateFnsImport, '');
        } else {
          s = s.replace(dateFnsImport, `import { ${filtered.join(', ')} } from 'date-fns';`);
        }
        changed = true;
      }
    }
  }

  return { code: s, changed };
}

const files = walk(ROOT);
let modified = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const { code, changed } = fix(src, f);
  if (changed && code !== src) {
    fs.writeFileSync(f, code);
    modified++;
    console.log(`✓ ${path.relative(path.join(__dirname, '..'), f)}`);
  }
}
console.log(`\nFixed ${modified} files.`);
