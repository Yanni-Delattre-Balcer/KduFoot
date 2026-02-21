const fs = require('fs');

// 1. Matches Page: Change "tournament" colors from purple to fuchsia (light purple) to distinguish from violet (dark purple)
const matchesFile = 'apps/client/src/pages/matches/index.tsx';
let matchesContent = fs.readFileSync(matchesFile, 'utf8');
// replace purple with fuchsia for tournaments
matchesContent = matchesContent.replace(/purple/g, 'fuchsia');
fs.writeFileSync(matchesFile, matchesContent);

// 2. Sessions Page: Change "blue" from royal blue to "indigo" (deep blue) to distinguish from Cyan (favorites)
const sessionsFile = 'apps/client/src/pages/sessions/planner.tsx';
let sessionsContent = fs.readFileSync(sessionsFile, 'utf8');
// replace blue/sky with indigo/violet? Let's go with deeply saturated violet-indigo
sessionsContent = sessionsContent.replace(/blue-500/g, 'indigo-600');
sessionsContent = sessionsContent.replace(/sky-400/g, 'indigo-400');
sessionsContent = sessionsContent.replace(/blue-100/g, 'indigo-100');
sessionsContent = sessionsContent.replace(/blue-600/g, 'indigo-700');
sessionsContent = sessionsContent.replace(/blue-400/g, 'indigo-500');
sessionsContent = sessionsContent.replace(/blue/g, 'indigo');
fs.writeFileSync(sessionsFile, sessionsContent);
