const fs = require('fs');

const file = 'apps/client/src/pages/dashboard/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 'Tout' subfilter color to Red
content = content.replace(
    /color=\{current === 'all' \? 'secondary' : 'default'\}/,
    `color={current === 'all' ? 'danger' : 'default'}`
);
content = content.replace(
    /className=\{current === 'all' \? 'font-bold bg-violet-600 text-white' : 'font-medium text-default-500'\}/,
    `className={current === 'all' ? 'font-bold bg-danger text-white' : 'font-medium text-default-500'}`
);

// Fix "Demandes Reçues" text
content = content.replace(
    /\{requestsSubFilter === 'all' \? t\('dashboard\.empty\.requests'\) : requestsSubFilter === 'match' \? t\('dashboard\.empty\.no_match'\) : t\('dashboard\.empty\.no_tournament'\)\}/,
    `{requestsSubFilter === 'all' ? "Vous n'avez aucune demande en attente pour le moment." : requestsSubFilter === 'match' ? t('dashboard.empty.no_match') : t('dashboard.empty.no_tournament')}`
);

// Fix "Matchs organisés" text and buttons
content = content.replace(
    /\{organizedSubFilter === 'all' \? t\('dashboard\.empty\.organized'\) : organizedSubFilter === 'match' \? t\('dashboard\.empty\.no_match'\) : t\('dashboard\.empty\.no_tournament'\)\}/,
    `{organizedSubFilter === 'all' ? "Vous n'avez publié aucune annonce" : organizedSubFilter === 'match' ? t('dashboard.empty.no_match') : t('dashboard.empty.no_tournament')}`
);

content = content.replace(
    /<Button as=\{Link\} to=\{organizedSubFilter === 'tournament' \? "\/matches\?type=tournament" : "\/matches"\} color=\{organizedSubFilter === 'tournament' \? 'default' : 'secondary'\} variant="flat" className=\{`font-bold \$\{organizedSubFilter === 'tournament' \? 'bg-purple-300\/20 text-purple-400' : 'bg-violet-500\/10 text-violet-400'\}`\}>\s*\{organizedSubFilter === 'tournament' \? "Rechercher un tournoi" : "Rechercher un match"\}\s*<\/Button>/,
    `{organizedSubFilter === 'all' ? (
                                            <div className="flex gap-4 justify-center items-center">
                                                <Button as={Link} to="/matches" color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400">Rechercher un match</Button>
                                                <Button as={Link} to="/matches?type=tournament" color="default" variant="flat" className="font-bold bg-purple-300/20 text-purple-400">Rechercher un tournoi</Button>
                                            </div>
                                        ) : (
                                            <Button as={Link} to={organizedSubFilter === 'tournament' ? "/matches?type=tournament" : "/matches"} color={organizedSubFilter === 'tournament' ? 'default' : 'secondary'} variant="flat" className={\`font-bold \${organizedSubFilter === 'tournament' ? 'bg-purple-300/20 text-purple-400' : 'bg-violet-500/10 text-violet-400'}\`}>
                                                {organizedSubFilter === 'tournament' ? "Rechercher un tournoi" : "Rechercher un match"}
                                            </Button>
                                        )}`
);

// Fix "Participations" text and buttons
content = content.replace(
    /\{participationsSubFilter === 'all' \? t\('dashboard\.empty\.participations'\) : participationsSubFilter === 'match' \? t\('dashboard\.empty\.no_match'\) : t\('dashboard\.empty\.no_tournament'\)\}/,
    `{participationsSubFilter === 'all' ? "Vous n'avez postulé à aucun match ni tournoi" : participationsSubFilter === 'match' ? t('dashboard.empty.no_match') : t('dashboard.empty.no_tournament')}`
);

content = content.replace(
    /<Button as=\{Link\} to=\{participationsSubFilter === 'tournament' \? "\/matches\?type=tournament" : "\/matches"\} color=\{participationsSubFilter === 'tournament' \? 'default' : 'secondary'\} variant="flat" className=\{`font-bold \$\{participationsSubFilter === 'tournament' \? 'bg-purple-300\/20 text-purple-400' : 'bg-violet-500\/10 text-violet-400'\}`\}>\s*\{participationsSubFilter === 'tournament' \? "Rechercher un tournoi" : "Rechercher un match"\}\s*<\/Button>/,
    `{participationsSubFilter === 'all' ? (
                                            <div className="flex gap-4 justify-center items-center">
                                                <Button as={Link} to="/matches" color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400">Rechercher un match</Button>
                                                <Button as={Link} to="/matches?type=tournament" color="default" variant="flat" className="font-bold bg-purple-300/20 text-purple-400">Rechercher un tournoi</Button>
                                            </div>
                                        ) : (
                                            <Button as={Link} to={participationsSubFilter === 'tournament' ? "/matches?type=tournament" : "/matches"} color={participationsSubFilter === 'tournament' ? 'default' : 'secondary'} variant="flat" className={\`font-bold \${participationsSubFilter === 'tournament' ? 'bg-purple-300/20 text-purple-400' : 'bg-violet-500/10 text-violet-400'}\`}>
                                                {participationsSubFilter === 'tournament' ? "Rechercher un tournoi" : "Rechercher un match"}
                                            </Button>
                                        )}`
);

fs.writeFileSync(file, content);
