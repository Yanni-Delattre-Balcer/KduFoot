const fs = require('fs');
['apps/client/src/pages/sessions/planner.tsx', 'apps/client/src/pages/favorites/index.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (file.includes('planner.tsx')) {
      content = content.replace(/rose-500/g, 'blue-500');
      content = content.replace(/rose-400/g, 'blue-400');
      content = content.replace(/pink-400/g, 'sky-400');
      content = content.replace(/rose/g, 'blue');
      content = content.replace(/pink/g, 'sky');
  }
  content = content.replace(/"warning"/g, '"secondary"');
  content = content.replace(/orange/g, 'violet');
  content = content.replace(/amber/g, 'purple');
  content = content.replace(/yellow/g, 'purple');
  fs.writeFileSync(file, content);
});
