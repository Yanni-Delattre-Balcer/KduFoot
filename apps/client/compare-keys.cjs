const fs = require('fs');
const path = require('path');

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function findMissing(namespace) {
    const frPath = path.join(__dirname, `src/locales/${namespace}/fr-FR.json`);
    const enPath = path.join(__dirname, `src/locales/${namespace}/en-US.json`);

    if (!fs.existsSync(frPath) || !fs.existsSync(enPath)) return {};

    const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

    const frKeys = getKeys(fr);
    const enKeys = new Set(getKeys(en));

    const missing = {};
    frKeys.filter(k => !enKeys.has(k)).forEach(k => {
        const parts = k.split('.');
        let val = fr;
        for (const p of parts) val = val[p];
        missing[k] = val;
    });
    return missing;
}

const missingKdufoot = findMissing('kdufoot');
const missingCommon = findMissing('common');

fs.writeFileSync('missing-keys.json', JSON.stringify({
    kdufoot: missingKdufoot,
    common: missingCommon
}, null, 2));

console.log('Missing keys written to missing-keys.json');
