#!/usr/bin/env node
/**
 * Codemod: standardize all date displays to dd/MM/yyyy via @/utils/dateFormat helpers.
 *
 * Transforms within src/**:
 *  - format(x, 'PPP'|'PP'|'MMM dd, yyyy'|'MMM d, yyyy'|'MMMM dd, yyyy'|'MMMM d, yyyy'|'dd MMM yyyy'|'MM/dd/yyyy'|'dd/MM/yyyy')
 *      -> formatDate(x)
 *  - format(x, 'MMM d, yyyy HH:mm'|'MMM dd, yyyy HH:mm'|'PPp'|'PPP HH:mm'|'dd MMM yyyy HH:mm')
 *      -> formatDateTime(x)
 *  - format(x, 'MMM d'|'MMM dd')  -> formatMonthShort(x)
 *  - .toLocaleDateString(...any args...) -> /* DDMMYYYY *\/ replaced via formatDate(<receiver>)
 *
 * Skips files in src/utils/dateFormat.ts and storage tokens like 'yyyy-MM-dd', 'HH:mm', etc.
 * Adds an import for the helpers used.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const HELPER_PATH = '@/utils/dateFormat';
const SKIP = new Set([
  path.normalize('src/utils/dateFormat.ts'),
  path.normalize('src/components/ui/date-picker.tsx'),
]);

// Tokens that must map to formatDate
const DATE_TOKENS = new Set([
  'PPP', 'PP', 'P',
  'MMM dd, yyyy', 'MMM d, yyyy',
  'MMMM dd, yyyy', 'MMMM d, yyyy',
  'dd MMM yyyy', 'd MMM yyyy',
  'MMM dd yyyy', 'MMM d yyyy',
  'MM/dd/yyyy', 'M/d/yyyy',
  'dd/MM/yyyy', 'd/M/yyyy',
  'do MMMM yyyy', 'do MMM yyyy',
]);

// Tokens that map to formatDateTime
const DATETIME_TOKENS = new Set([
  'MMM d, yyyy HH:mm', 'MMM dd, yyyy HH:mm',
  'MMM d, yyyy h:mm a', 'MMM dd, yyyy h:mm a',
  'PPp', 'PPpp',
  'PPP HH:mm', 'PPP h:mm a',
  'dd MMM yyyy HH:mm', 'd MMM yyyy HH:mm',
  'dd/MM/yyyy HH:mm', 'MM/dd/yyyy HH:mm',
]);

// Tokens that map to formatMonthShort
const MONTH_SHORT_TOKENS = new Set(['MMM d', 'MMM dd', 'd MMM', 'dd MMM']);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(ent.name)) files.push(full);
  }
  return files;
}

function transform(src) {
  let used = new Set();
  let changed = false;

  // 1) Replace format(<expr>, '<token>') for known display tokens.
  //    We need a tolerant matcher for the second arg; we'll find `format(`, then balance parens.
  const out = [];
  let i = 0;
  while (i < src.length) {
    // Look for "format(" not preceded by a word char (so we don't match e.g. "myFormat(")
    if (
      src.slice(i, i + 7) === 'format(' &&
      (i === 0 || !/[A-Za-z0-9_$]/.test(src[i - 1]))
    ) {
      // find matching close paren
      let depth = 1;
      let j = i + 7;
      let inStr = null;
      while (j < src.length && depth > 0) {
        const c = src[j];
        if (inStr) {
          if (c === '\\') { j += 2; continue; }
          if (c === inStr) inStr = null;
        } else {
          if (c === '"' || c === "'" || c === '`') inStr = c;
          else if (c === '(') depth++;
          else if (c === ')') depth--;
        }
        if (depth === 0) break;
        j++;
      }
      if (depth !== 0) { out.push(src[i]); i++; continue; }
      const inside = src.slice(i + 7, j); // arguments
      // split top-level commas
      const args = splitArgs(inside);
      if (args.length >= 2) {
        const tokenArg = args[1].trim();
        const m = tokenArg.match(/^['"`](.+)['"`]$/);
        if (m) {
          const tok = m[1];
          let helper = null;
          if (DATE_TOKENS.has(tok)) helper = 'formatDate';
          else if (DATETIME_TOKENS.has(tok)) helper = 'formatDateTime';
          else if (MONTH_SHORT_TOKENS.has(tok)) helper = 'formatMonthShort';
          if (helper) {
            used.add(helper);
            out.push(`${helper}(${args[0].trim()})`);
            i = j + 1;
            changed = true;
            continue;
          }
        }
      }
    }
    out.push(src[i]);
    i++;
  }
  let result = out.join('');

  // 2) Replace `<expr>.toLocaleDateString(...)` -> `formatDate(<expr>)`.
  //    Tolerant: find ".toLocaleDateString(" then balance parens.
  const result2 = [];
  i = 0;
  while (i < result.length) {
    const idx = result.indexOf('.toLocaleDateString(', i);
    if (idx === -1) { result2.push(result.slice(i)); break; }
    // find receiver (expression before the dot)
    const recvEnd = idx; // position of '.'
    const recvStart = findExprStart(result, recvEnd - 1);
    // find matching close paren
    let depth = 1;
    let j = idx + '.toLocaleDateString('.length;
    let inStr = null;
    while (j < result.length && depth > 0) {
      const c = result[j];
      if (inStr) {
        if (c === '\\') { j += 2; continue; }
        if (c === inStr) inStr = null;
      } else {
        if (c === '"' || c === "'" || c === '`') inStr = c;
        else if (c === '(') depth++;
        else if (c === ')') depth--;
      }
      if (depth === 0) break;
      j++;
    }
    if (depth !== 0) {
      result2.push(result.slice(i, idx + 1));
      i = idx + 1;
      continue;
    }
    // Inspect args to see if it included a time component (hour/minute/second)
    const argsStr = result.slice(idx + '.toLocaleDateString('.length, j);
    const includesTime = /\b(hour|minute|second)\b/.test(argsStr);
    const helper = includesTime ? 'formatDateTime' : 'formatDate';
    used.add(helper);
    let recvExpr = result.slice(recvStart, recvEnd);
    // strip wrapping `new Date(x)` -> use as-is anyway; helper handles it
    result2.push(result.slice(i, recvStart));
    result2.push(`${helper}(${recvExpr})`);
    i = j + 1;
    changed = true;
  }
  result = result2.join('');

  if (!changed) return { code: src, changed: false, used };

  // 3) Insert/extend import from @/utils/dateFormat
  if (used.size > 0) {
    const importRegex = /import\s*\{([^}]*)\}\s*from\s*['"]@\/utils\/dateFormat['"]\s*;?/;
    const match = result.match(importRegex);
    if (match) {
      const existing = match[1].split(',').map(s => s.trim()).filter(Boolean);
      const merged = Array.from(new Set([...existing, ...used]));
      result = result.replace(importRegex, `import { ${merged.join(', ')} } from '@/utils/dateFormat';`);
    } else {
      // insert after last import line
      const lines = result.split('\n');
      let lastImport = -1;
      for (let k = 0; k < lines.length; k++) {
        if (/^\s*import\b/.test(lines[k])) lastImport = k;
        else if (lastImport !== -1 && lines[k].trim() === '') continue;
        else if (lastImport !== -1) break;
      }
      const importLine = `import { ${Array.from(used).join(', ')} } from '@/utils/dateFormat';`;
      if (lastImport === -1) lines.unshift(importLine); else lines.splice(lastImport + 1, 0, importLine);
      result = lines.join('\n');
    }
  }

  return { code: result, changed: true, used };
}

function splitArgs(s) {
  const args = [];
  let depth = 0;
  let inStr = null;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      args.push(s.slice(start, i));
      start = i + 1;
    }
  }
  args.push(s.slice(start));
  return args;
}

// Find the start of an expression ending at index `end` (inclusive).
// Walks backwards through identifiers, member access, balanced (), [], strings, and template literals.
function findExprStart(s, end) {
  let i = end;
  // skip trailing whitespace
  while (i >= 0 && /\s/.test(s[i])) i--;
  let depth = 0;
  while (i >= 0) {
    const c = s[i];
    if (c === ')' || c === ']') { depth++; i--; continue; }
    if (c === '(' || c === '[') {
      if (depth === 0) { i++; break; }
      depth--; i--; continue;
    }
    if (depth > 0) { i--; continue; }
    if (/[A-Za-z0-9_$.?!]/.test(c)) { i--; continue; }
    // string literal end?
    if (c === '"' || c === "'" || c === '`') {
      const quote = c; i--;
      while (i >= 0) {
        if (s[i] === quote && s[i - 1] !== '\\') { i--; break; }
        i--;
      }
      continue;
    }
    // whitespace within expr (e.g. ". ") — allow only if we just processed a dot etc.
    if (/\s/.test(c)) { i--; continue; }
    i++;
    break;
  }
  if (i < 0) i = 0;
  return i;
}

const files = walk(ROOT);
let modified = 0;
for (const f of files) {
  const rel = path.relative(path.join(__dirname, '..'), f);
  if (SKIP.has(path.normalize(rel))) continue;
  const src = fs.readFileSync(f, 'utf8');
  const { code, changed, used } = transform(src);
  if (changed && code !== src) {
    fs.writeFileSync(f, code);
    modified++;
    console.log(`✓ ${rel}  (${Array.from(used).join(', ')})`);
  }
}
console.log(`\nModified ${modified} files.`);
