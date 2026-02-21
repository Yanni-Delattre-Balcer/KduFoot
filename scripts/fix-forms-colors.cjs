const fs = require('fs');

// ==== 1. MATCH FORM (Dark Violet) ====
const matchForm = 'apps/client/src/components/matches/match-form.tsx';
let mContent = fs.readFileSync(matchForm, 'utf8');

// Replace yellow themes with dark violet theme
mContent = mContent.replace(/border-yellow-500\/20/g, 'border-violet-800/20');
mContent = mContent.replace(/bg-yellow-500\/5/g, 'bg-violet-900/10');
mContent = mContent.replace(/bg-linear-to-r from-yellow-500\/10/g, 'bg-linear-to-r from-violet-800/20');
mContent = mContent.replace(/bg-yellow-500\/20/g, 'bg-violet-800/30');
mContent = mContent.replace(/text-yellow-600/g, 'text-violet-400');
mContent = mContent.replace(/text-yellow-700/g, 'text-violet-300');
mContent = mContent.replace(/bg-yellow-500\/10/g, 'bg-violet-900/30');
mContent = mContent.replace(/border-yellow-500\/20/g, 'border-violet-600/30');
mContent = mContent.replace(/ring-yellow-500\/5/g, 'ring-violet-500/10');
mContent = mContent.replace(/rgba\(234,179,8,0\.3\)/g, 'rgba(139,92,246,0.3)'); // shadow color update
mContent = mContent.replace(/linear-gradient\(90deg, #eab308 0%, #fbbf24 50%, #fef3c7 100%\)/g, 'linear-gradient(90deg, #5b21b6 0%, #7c3aed 50%, #c4b5fd 100%)'); // progress bar
mContent = mContent.replace(/bg-yellow-500 font-bold text-yellow-950/g, 'bg-violet-700 font-bold text-white');
mContent = mContent.replace(/bg-warning-50/g, 'bg-violet-900/20');
mContent = mContent.replace(/border-warning-200/g, 'border-violet-700/50');
mContent = mContent.replace(/bg-warning-100/g, 'bg-violet-800/40');
mContent = mContent.replace(/text-warning-600/g, 'text-violet-400');
mContent = mContent.replace(/text-warning-900/g, 'text-violet-100');
mContent = mContent.replace(/text-warning-800/g, 'text-violet-200');
mContent = mContent.replace(/text-warning-950/g, 'text-white');
mContent = mContent.replace(/border-warning-200\/50/g, 'border-violet-600/50');
mContent = mContent.replace(/color="warning"/g, 'color="secondary"');
mContent = mContent.replace(/shadow-\[0_0_20px_rgba\(234,179,8,0\.3\)\]/g, 'shadow-[0_0_20px_rgba(139,92,246,0.3)]');


fs.writeFileSync(matchForm, mContent);


// ==== 2. TOURNAMENT FORM (Light Violet/Purple-300) ====
const tourForm = 'apps/client/src/components/matches/tournament-form.tsx';
let tContent = fs.readFileSync(tourForm, 'utf8');

// Replace yellow themes with light violet (purple) theme
tContent = tContent.replace(/border-yellow-500\/20/g, 'border-purple-300/40');
tContent = tContent.replace(/bg-yellow-500\/5/g, 'bg-purple-300/10');
tContent = tContent.replace(/bg-linear-to-r from-yellow-500\/10/g, 'bg-linear-to-r from-purple-300/20');
tContent = tContent.replace(/bg-yellow-500\/20/g, 'bg-purple-300/30');
tContent = tContent.replace(/text-yellow-600/g, 'text-purple-400');
tContent = tContent.replace(/text-yellow-700/g, 'text-purple-300');
tContent = tContent.replace(/bg-yellow-500\/10/g, 'bg-purple-400/20');
tContent = tContent.replace(/border-yellow-500\/20/g, 'border-purple-300/40');
tContent = tContent.replace(/ring-yellow-500\/5/g, 'ring-purple-300/20');
tContent = tContent.replace(/rgba\(234,179,8,0\.3\)/g, 'rgba(216,180,254,0.3)'); // shadow color update
tContent = tContent.replace(/linear-gradient\(90deg, #eab308 0%, #fbbf24 50%, #fef3c7 100%\)/g, 'linear-gradient(90deg, #c084fc 0%, #d8b4fe 50%, #f3e8ff 100%)'); // progress bar
tContent = tContent.replace(/bg-yellow-500 font-bold text-yellow-950/g, 'bg-purple-300 font-bold text-purple-950');
tContent = tContent.replace(/bg-warning-50/g, 'bg-purple-300/20');
tContent = tContent.replace(/border-warning-200/g, 'border-purple-400/50');
tContent = tContent.replace(/bg-warning-100/g, 'bg-purple-300/40');
tContent = tContent.replace(/text-warning-600/g, 'text-purple-500');
tContent = tContent.replace(/text-warning-900/g, 'text-purple-100');
tContent = tContent.replace(/text-warning-800/g, 'text-purple-200');
tContent = tContent.replace(/text-warning-950/g, 'text-white');
tContent = tContent.replace(/border-warning-200\/50/g, 'border-purple-400/50');
tContent = tContent.replace(/color="warning"/g, 'className="bg-purple-300 text-purple-950 font-bold"');
tContent = tContent.replace(/shadow-\[0_0_20px_rgba\(234,179,8,0\.3\)\]/g, 'shadow-[0_0_20px_rgba(216,180,254,0.3)]');

fs.writeFileSync(tourForm, tContent);
