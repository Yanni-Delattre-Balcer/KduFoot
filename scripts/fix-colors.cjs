const fs = require('fs');

// REVERT DASHBOARD TO ORANGE
const dashFile = 'apps/client/src/pages/dashboard/index.tsx';
let dash = fs.readFileSync(dashFile, 'utf8');
dash = dash.replace(/color="secondary"/g, 'color="warning"');
dash = dash.replace(/violet/g, 'orange');
dash = dash.replace(/purple/g, 'amber');
dash = dash.replace(/fuchsia/g, 'yellow');
// Re-apply violet specifically to the "Rechercher un match" buttons which appear twice
dash = dash.replace(/bg-orange-500\/10 text-orange-400/g, 'bg-violet-500/10 text-violet-400');
dash = dash.replace(/<Button as=\{Link\} to="\/matches" color="warning" variant="flat" className="font-bold bg-violet-500\/10 text-violet-400">Rechercher un match<\/Button>/g, '<Button as={Link} to="/matches" color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400">Rechercher un match</Button>');

fs.writeFileSync(dashFile, dash);

// UPDATE MATCHES PAGE TO DISTINCT VIOLETS
const matchFile = 'apps/client/src/pages/matches/index.tsx';
let match = fs.readFileSync(matchFile, 'utf8');

// Match = Dark Violet (violet-800, violet-700, violet-900)
match = match.replace(/from-violet-500\/20 via-fuchsia-400\/15/g, 'from-violet-900/40 via-violet-800/30'); // old
match = match.replace(/from-violet-500\/20 via-purple-400\/15/g, 'from-violet-900/40 via-violet-800/30'); // uiConfig gradient
match = match.replace(/border-violet-500\/20/g, 'border-violet-800/50'); // uiConfig border
match = match.replace(/from-violet-500 via-fuchsia-400 to-fuchsia-400/g, 'from-violet-800 via-violet-700 to-violet-600'); 
match = match.replace(/from-violet-500 via-purple-400 to-purple-400/g, 'from-violet-800 via-violet-700 to-violet-600'); // uiConfig titleGradient
match = match.replace(/text-violet-500/g, 'text-violet-700'); // uiConfig iconColor
match = match.replace(/from-violet-500 to-fuchsia-500/g, 'from-violet-800 to-violet-600'); // buttons
match = match.replace(/shadow-violet-500\/40 bg-linear-to-r from-violet-500 to-purple-500/g, 'shadow-violet-800/40 bg-linear-to-r from-violet-800 to-violet-600'); // buttons new
match = match.replace(/shadow-violet-500\/30/g, 'shadow-violet-800/40');
match = match.replace(/bg-violet-500\/10 text-violet-400/g, 'bg-violet-800/20 text-violet-300'); // maybe wait this isn't here
match = match.replace(/bg-violet-500\/10/g, 'bg-violet-800/20');
match = match.replace(/text-violet-600 dark:text-violet-400/g, 'text-violet-800 dark:text-violet-300');
match = match.replace(/bg-violet-100/g, 'bg-violet-900/20');
match = match.replace(/text-violet-700/g, 'text-violet-200');


// Tournament = Light Violet (purple-300, fuchsia-300)
match = match.replace(/from-fuchsia-300\/15/g, 'from-purple-300/20'); 
match = match.replace(/from-purple-300\/15 via-purple-200\/5/g, 'from-purple-300/30 via-purple-200/10'); // uiConfig gradient
match = match.replace(/border-fuchsia-400\/20/g, 'border-purple-300/40'); 
match = match.replace(/border-purple-400\/20/g, 'border-purple-300/40'); // uiConfig border
match = match.replace(/from-fuchsia-400 to-fuchsia-500/g, 'from-purple-400 to-purple-300'); 
match = match.replace(/from-purple-400 to-purple-500/g, 'from-purple-400 to-purple-300'); // uiConfig titleGradient
match = match.replace(/text-fuchsia-500/g, 'text-purple-300');
match = match.replace(/text-purple-500/g, 'text-purple-300'); // uiConfig iconColor
match = match.replace(/bg-fuchsia-400/g, 'bg-purple-300'); 
match = match.replace(/bg-purple-400/g, 'bg-purple-300'); // buttons
match = match.replace(/text-fuchsia-900/g, 'text-purple-950'); 
match = match.replace(/text-purple-900/g, 'text-purple-950'); // buttons text
match = match.replace(/shadow-fuchsia-500\/20/g, 'shadow-purple-300/30'); 
match = match.replace(/shadow-purple-500\/20/g, 'shadow-purple-300/30'); // buttons shadow
match = match.replace(/shadow-fuchsia-500\/30/g, 'shadow-purple-300/40'); 
match = match.replace(/shadow-purple-500\/30/g, 'shadow-purple-300/40'); // buttons shadow
match = match.replace(/bg-fuchsia-500\/10/g, 'bg-purple-300/20');
match = match.replace(/text-fuchsia-600 dark:text-fuchsia-400/g, 'text-purple-400 dark:text-purple-200');

fs.writeFileSync(matchFile, match);
