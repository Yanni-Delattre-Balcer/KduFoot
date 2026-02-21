const fs = require('fs');
const file = 'apps/client/src/pages/dashboard/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove yellow from 'Matchs Organisés' tournament cards icon
content = content.replace(/bg-yellow-500\/20 text-yellow-500/g, 'bg-purple-500/20 text-purple-400');

// 2. Remove italic from empty state
content = content.replace(/font-medium italic/g, 'font-medium');

// 3. Ensure all 'Rechercher un match' buttons in empty states are correctly styled in Violet
// They are sometimes teal-500/10 or warning or secondary
content = content.replace(/color="warning" variant="flat" className="font-bold bg-teal-500\/10 text-teal-400"/g, 'color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400"');
content = content.replace(/color="secondary" variant="flat" className="font-bold bg-teal-500\/10 text-teal-400"/g, 'color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400"');
content = content.replace(/color="warning" variant="flat" className="font-bold bg-violet-500\/10 text-violet-400"/g, 'color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400"');


fs.writeFileSync(file, content);
