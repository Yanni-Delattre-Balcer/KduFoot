const fs = require('fs');

// Fix pricing page
const pricingFile = 'apps/client/src/pages/pricing/index.tsx';
let pricingContent = fs.readFileSync(pricingFile, 'utf8');

// Header gradient and borders (from secondary to purple/fuchsia)
pricingContent = pricingContent.replace(/from-secondary\/15/g, 'from-purple-400/20');
pricingContent = pricingContent.replace(/border-secondary\/20/g, 'border-purple-300/30');
pricingContent = pricingContent.replace(/bg-secondary\/10/g, 'bg-purple-400/10');
pricingContent = pricingContent.replace(/text-secondary/g, 'text-purple-400');
pricingContent = pricingContent.replace(/from-secondary to-purple-500/g, 'from-purple-400 to-fuchsia-400');

// Elite Plan
pricingContent = pricingContent.replace(
    /color: "secondary" as const,\s*gradient: "from-secondary\/25 to-purple-500\/15",/g,
    'color: "default" as const,\n      gradient: "from-purple-400/25 to-fuchsia-500/15",'
);

// We need to modify the Button in the Footer of the plan. Elite plan uses plan.color, which we changed to 'default'.
// We want to make sure the text for default is fuchsia. We can inject a custom class if color is default.
pricingContent = pricingContent.replace(
    /className="font-bold"/g,
    'className={`font-bold ${plan.color === \'default\' && plan.key === \'elite\' ? \'bg-purple-300/20 text-purple-400\' : \'\'}`}'
);

fs.writeFileSync(pricingFile, pricingContent);

// Fix planner.tsx empty state button
const plannerFile = 'apps/client/src/pages/sessions/planner.tsx';
let plannerContent = fs.readFileSync(plannerFile, 'utf8');

plannerContent = plannerContent.replace(
    /<Button as=\{Link\} to="\/matches" color="primary" variant="flat" size="sm" className="font-bold">Créer une annonce<\/Button>/g,
    `<Button as={Link} to={view === 'tournaments' ? "/matches/new?type=tournament" : "/matches/new"} color={view === 'tournaments' ? "default" : "secondary"} variant="flat" size="sm" className={\`font-bold \${view === 'tournaments' ? 'bg-purple-300/20 text-purple-400' : 'bg-violet-500/10 text-violet-400'}\`}>Créer une annonce</Button>`
);

// The history tab itself actually had a button check.
plannerContent = plannerContent.replace(
    /<Button size="sm" variant="light" className="w-full text-\[10px\] font-bold text-default-400 h-6" as=\{Link\} to=\{`\/matches\/\$\{request\.match_id\}`\}>Voir l'annonce<\/Button>/g,
    `<Button size="sm" variant="flat" className={\`w-full text-[10px] font-bold h-7 \${request.type === 'tournament' ? 'bg-purple-300/10 text-purple-400' : 'bg-violet-500/10 text-violet-400'}\`} as={Link} to={\`/matches/\${request.match_id}\`}>Voir l'annonce</Button>`
);

fs.writeFileSync(plannerFile, plannerContent);
