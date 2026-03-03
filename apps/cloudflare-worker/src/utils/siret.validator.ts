const FOOTBALL_CLUB_KEYWORDS: string[] = [
    // TERMES 100% FOOTBALL — jamais ambigus
    'FOOTBALL', 'FOOT',
    'FUTSAL',
    'FOOT SALLE', 'FOOT EN SALLE',
    'BEACH SOCCER', 'BEACH FOOT',
    'SOCCER',
    'JORKYBALL',
    'LOISIR FOOT', 'LOISIRS FOOT',
    'SECTION FOOT', 'SECTION FOOTBALL',
    'FOOTBALL FÉMININ', 'FOOT FÉMININ',
    'FOOT EN MARCHANT', 'FOOT MARCHANT',
    'CÉCIFOOT', 'CECIFOOT',
    'FOOT FAUTEUIL',
    'ÉCOLE DE FOOT', 'ECOLE DE FOOT',
    'ÉCOLE DE FOOTBALL', 'ECOLE DE FOOTBALL',
    'CENTRE DE FORMATION',

    // ACRONYMES
    'A.S.', 'AS',
    'F.C.', 'FC',
    'U.S.', 'US',
    'S.C.', 'SC',
    'R.C.', 'RC',
    'A.C.', 'AC',
    'E.C.', 'EC',
    'O.C.', 'OC',
    'C.S.', 'CS',
    'E.S.', 'ES',
    'J.S.', 'JS',
    'O.S.', 'OS',
    'G.S.', 'GS',
    'S.M.', 'SM',
    'C.O.', 'CO',
    'S.O.', 'SO',
    'C.F.', 'CF',
    'A.F.', 'AF',
    'A.J.', 'AJ',
    'C.A.', 'CA',
    'G.F.', 'GF',
    'U.A.', 'UA',
    'U.F.', 'UF',
    'S.U.', 'SU',
    'S.R.', 'SR',
    'O.L.', 'OL',
    'O.M.', 'OM',
    'G.J.', 'GJ',
    'R.U.', 'RU',
    'E.A.', 'EA',
    'S.P.', 'SP',
    'A.V.', 'AV',
    'F.A.', 'FA',
    'A.S.C.', 'ASC',
    'A.S.I.', 'ASI',
    'A.S.M.', 'ASM',
    'A.S.F.', 'ASF',
    'A.S.L.', 'ASL',
    'A.S.R.', 'ASR',
    'A.S.U.', 'ASU',
    'A.S.B.', 'ASB',
    'A.SP.J.', 'ASPJ',
    'C.S.A.', 'CSA',
    'C.S.O.', 'CSO',
    'C.S.C.', 'CSC',
    'S.C.O.', 'SCO',
    'F.C.O.', 'FCO',
    'F.C.C.', 'FCC',
    'G.F.C.', 'GFC',
    'G.F.A.', 'GFA',
    'G.D.R.', 'GDR',
    'R.C.F.', 'RCF',
    'U.S.O.', 'USO',
    'U.S.V.', 'USV',
    'U.S.L.', 'USL',
    'U.S.C.', 'USC',
    'U.S.R.', 'USR',
    'U.S.M.', 'USM',
    'U.C.F.', 'UCF',
    'V.G.A.', 'VGA',
    'A.G.S.', 'AGS',
    'O.G.C.', 'OGC',
    'G.S.I.', 'GSI',
    'E.S.A.', 'ESA',
    'E.S.B.', 'ESB',
    'E.S.O.', 'ESO',
    'E.T.S.', 'ETS',
    'ENT.S.', 'ENTS',
    'S.P.C.', 'SPC',
    'O.SP.C.', 'OSPC',
    'A.M.S.', 'AMS',
    'A.V.S.', 'AVS',
    'C.A.F.', 'CAF',
    'S.A.M.', 'SAM',
    'J.S.A.', 'JSA',
    'G.S.F.', 'GSF',
    'C.E.R.C.', 'CERC',
    'ASPTT',
    'ASFO',
    'ACP',
    'SASP',
    'SAOS',
    'EUSRL',

    // TERMES SPORTIFS
    'SPORTING',
    'OLYMPIQUE',
    'RACING',
    'ATLETICO', 'ATHLETICO',
    'INTER',
    'REAL',
    'DYNAMO',
    'RAPID',
    'LOKOMOTIV',
    'RED STAR',
    'GAZELEC',
    'UNITED',
    'ROVERS',
    'BOYS',
    'STARS',

    // TERMES IDENTITAIRES
    'JEUNESSE',
    'JEUNES',
    'JEANNE D\'ARC', 'JEANNE-D\'ARC',
    'PATRONAGE', 'PATRO',
    'CHEMINOTS',
    'ÉTOILE', 'ETOILE',
    'ESPÉRANCE', 'ESPERANCE',
    'CONCORDIA',
    'RACING CLUB',
    'FOOTBALL CLUB',
    'SPORTING CLUB',
    'PÔLE ESPOIRS', 'POLE ESPOIRS',
    'GROUPEMENT'
];

const NON_FOOTBALL_KEYWORDS: string[] = [
    // SPORTS DE RAQUETTE / BALLE
    'TENNIS',
    'TENNIS DE TABLE',
    'PING PONG', 'PING-PONG',
    'BADMINTON',
    'SQUASH',
    'PADEL', 'PADEL CLUB',
    'PELOTE', 'PELOTE BASQUE',
    'BALLE AU TAMBOURIN',
    'LONGUE PAUME',
    'JEU DE PAUME',
    'RACQUETBALL',

    // SPORTS COLLECTIFS
    'RUGBY', 'RUGBY XV', 'RUGBY XIII', 'RUGBY A 7', 'RUGBY À 7',
    'BASKET', 'BASKETBALL', 'BASKET-BALL', 'BASKET BALL',
    'HANDBALL', 'HAND BALL', 'HAND',
    'VOLLEYBALL', 'VOLLEY', 'VOLLEY-BALL', 'VOLLEY BALL', 'BEACH VOLLEY', 'BEACH-VOLLEY',
    'HOCKEY', 'HOCKEY SUR GLACE', 'HOCKEY SUR GAZON', 'FIELD HOCKEY', 'FLOORHOCKEY',
    'WATER POLO', 'WATERPOLO',
    'POLO',
    'CRICKET',
    'BASEBALL', 'BASE BALL', 'SOFTBALL', 'SOFT BALL',
    'FOOTBALL AMERICAIN', 'FOOTBALL AMÉRICAIN', 'FLAG FOOTBALL',
    'LACROSSE', 'CROSSE',
    'NETBALL',
    'ULTIMATE', 'FRISBEE',
    'KORFBALL',
    'KIN-BALL', 'KINBALL',
    'HORSEBALL', 'HORSE BALL',
    'TCHOUKBALL',
    'FLOORBALL',
    'RINK HOCKEY',
    'ROLLER HOCKEY',
    'GOALBALL',
    'BOCCIA',
    'SITTING VOLLEYBALL',

    // NATATION ET SPORTS AQUATIQUES
    'NATATION',
    'NAGE', 'NAGE EN EAU VIVE',
    'NATATION ARTISTIQUE', 'NATATION SYNCHRONISÉE', 'NATATION SYNCHRONISEE',
    'PLONGEON',
    'SWIMMING',
    'AQUAGYM', 'AQUABIKE',
    'PLONGÉE', 'PLONGEE', 'SOUS-MARINE',
    'APNÉE', 'APNEE',
    'SAUVETAGE', 'SAUVETAGE SPORTIF',
    'NAGE EN EAU LIBRE',

    // SPORTS NAUTIQUES
    'AVIRON',
    'CANOE', 'CANOË', 'CANOË-KAYAK', 'CANOE-KAYAK',
    'KAYAK', 'KAYAK POLO',
    'PADDLE', 'PADDLEBOARD',
    'PIROGUE',
    'RAFTING',
    'CANYONING',
    'SKI NAUTIQUE', 'SKI-NAUTIQUE',
    'WAKEBOARD',
    'VOILE',
    'VOILIER',
    'NAUTIQUE',
    'SURF', 'SURF CASTING',
    'KITESURF', 'KITE SURF', 'KITEBOARD',
    'WINDSURF', 'FUNBOARD',
    'STAND UP PADDLE',
    'LONGE-COTE',

    // CYCLISME
    'CYCLISME',
    'VÉLO', 'VELO',
    'VTT',
    'BMX',
    'CYCLING',
    'CYCLOTOURISME',
    'PISTE',
    'MOUNTAIN BIKE',
    'ROLLER', 'ROLLER SKATING',
    'SKATEBOARD', 'SKATE',
    'TROTTINETTE',
    'PATINAGE', 'PATIN', 'PATINOIRE',
    'PATINAGE ARTISTIQUE',
    'PATINAGE DE VITESSE',
    'PATINAGE SUR GLACE',

    // ATHLÉTISME
    'ATHLÉTISME', 'ATHLETISME',
    'MARATHON',
    'RUNNING',
    'TRAIL',
    'COURSE A PIED', 'COURSE À PIED',
    'COURSE D\'ORIENTATION', 'COURSE D\'ORIENT.',
    'MARCHE', 'MARCHE ATHLÉTIQUE', 'MARCHE NORDIQUE',
    'RANDONNÉE', 'RANDONNEE',
    'TRIATHLON',
    'DUATHLON',
    'BIATHLON',
    'PENTATHLON', 'PENTATHLON MODERNE',
    'DÉCATHLON', 'DECATHLON',
    'HEPTATHLON',
    'SAUT EN LONGUEUR',
    'SAUT EN HAUTEUR',
    'SAUT A LA PERCHE', 'SAUT À LA PERCHE',
    'TRIPLE SAUT',
    'LANCER DU DISQUE',
    'LANCER DU MARTEAU',
    'LANCER DU JAVELOT',
    'LANCER DU POIDS',

    // COMBAT
    'JUDO', 'JUDO CLUB',
    'KARATÉ', 'KARATE', 'KARATE CLUB',
    'BOXE', 'BOXE ANGLAISE', 'BOXING',
    'BOXE FRANÇAISE', 'SAVATE',
    'LUTTE',
    'ESCRIME',
    'TAEKWONDO',
    'AIKIDO', 'AÏKIDO',
    'KUNG FU', 'WUSHU',
    'MMA', 'MIXED MARTIAL ARTS',
    'JUJITSU', 'JU-JITSU', 'JIU JITSU', 'JUJUTSU',
    'KRAV MAGA',
    'MUAY THAI', 'THAI BOXE',
    'KICK BOXING', 'KICKBOXING', 'FULL CONTACT', 'FULL-CONTACT',
    'KENDO',
    'KEMPO',
    'HAPKIDO',
    'KOBUDO',
    'KYUDO',
    'SAMBO',
    'SUMO',
    'CATCH',
    'CAPOEIRA',
    'PENCAK SILAT',
    'BÉHOURD', 'BEHOURD',

    // GLISSE / HIVER
    'SKI', 'SKI CLUB', 'SKI ALPIN', 'SKI DE FOND', 'SKI DE RANDONNÉE',
    'SKI FREESTYLE', 'SKI ACROBATIQUE', 'SKI ALPINISME',
    'SNOWBOARD',
    'LUGE',
    'BOBSLEIGH', 'BOBSLED',
    'SKELETON',
    'CURLING',
    'COMBINÉ NORDIQUE', 'COMBINE NORDIQUE',
    'SAUT À SKI', 'SAUT A SKI',

    // MÉCANIQUES
    'MOTO', 'MOTOCROSS', 'MOTARD', 'MOTOCYCLISME',
    'AUTO', 'AUTOMOBILE',
    'KARTING', 'KART',
    'FORMULE 1', 'FORMULE1', 'F1',
    'SPORT AUTOMOBILE',
    'RALLYE',
    'ENDURO',
    'TRIAL',
    'GIRAVIATION',

    // ÉQUESTRES
    'ÉQUITATION', 'EQUITATION',
    'HIPPIQUE',
    'HIPPODROME',
    'CHEVAL', 'CAVALIER',
    'DRESSAGE',
    'CONCOURS COMPLET',
    'SAUT D\'OBSTACLES',
    'ENDURANCE EQUESTRE',

    // AÉRIENS
    'PARACHUTISME',
    'PARAPENTE',
    'DELTAPLANE',
    'ULM',
    'AÉROCLUB', 'AEROCLUB',
    'AÉRONAUTIQUE', 'AERONAUTIQUE',
    'VOL LIBRE',
    'VOL A VOILE', 'VOL À VOILE',

    // FORCE / GYM
    'MUSCULATION',
    'FITNESS',
    'CROSSFIT',
    'HALTÉROPHILIE', 'HALTEROPHILIE',
    'POWERLIFTING',
    'FORCE ATHLÉTIQUE', 'FORCE ATHLETIQUE',
    'BODYBUILDING',
    'AÉROBIC', 'AEROBIC',
    'GYM DOUCE',

    // GYMNASTIQUE
    'GYMNASTIQUE',
    'GYM',
    'GYMNASE',
    'TRAMPOLINE',
    'ACROBATIE',
    'TUMBLING',
    'CHEERLEADING', 'CHEERLEADER',
    'TWIRLING',
    'DANSE', 'DANCING',
    'HIP HOP',
    'ZUMBA',
    'CLAQUETTES',
    'CIRQUE',
    'BREAKING', 'BREAK DANCE',

    // MONTAGNE
    'ESCALADE',
    'ALPINISME',
    'MONTAGNE',
    'SPÉLÉOLOGIE', 'SPELEOLOGIE',
    'VIA FERRATA',

    // PRÉCISION
    'PÉTANQUE', 'PETANQUE',
    'BOULES', 'BOULODROME',
    'SPORT BOULES',
    'SPORT-BOULES',
    'JEUX PROVENÇAUX', 'JEUX PROVENCAUX',
    'GOLF', 'GOLF CLUB', 'MINI GOLF',
    'TIR', 'TIR SPORTIF', 'TIR À LA CIBLE', 'TIR A LA CIBLE',
    'TIR À L\'ARC', 'TIR A L\'ARC',
    'ARCHERIE', 'ARCHERY',
    'FLÉCHETTES', 'FLECHETTES', 'DARTS',
    'BILLARD',
    'BOWLING', 'SPORT DE QUILLES',
    'CROQUET',

    // PLEINE NATURE
    'PÊCHE', 'PECHE', 'PÊCHE SPORTIVE', 'PECHE SPORTIVE',
    'CHASSE',
    'TIR AU PIGEON',

    // ESPRIT
    'ÉCHECS', 'ECHECS', 'CHESS',
    'SCRABBLE',
    'BRIDGE',
    'DAMES', 'JEU DE DAMES',
    'GO',

    // ADAPTÉS
    'HANDISPORT',
    'BOCCIA',
    'GOALBALL',
    'TORBALL',
    'PARA',

    // AUTRES
    'QUIDDITCH', 'QUADBALL',
    'LACROSSE'
];

/**
 * Validates the APE code and the club name to ensure it's a football club.
 * Rule 1: APE allowed: 93, 85.51Z, 8551Z, 94.99Z, 9499Z (and their prefixes). 
 *         Actually, we allow 93.x, 85.51Z, 94.99Z.
 * Rule 2: If APE is 94.99Z/9499Z, verify keywords: FC, AS, US, SC, ES, Foot, Soccer, Futsal, Stade, Academy.
 * Rule 3: Reject explicitly if name contains exclusion keywords.
 * 
 * @param ape The APE code (activite_principale)
 * @param clubName The full name of the club
 * @returns { isValid: boolean, reason?: string }
 */
export function validateClubSiret(ape?: string, clubName?: string): { isValid: boolean, reason?: string } {
    if (!ape) {
        return { isValid: false, reason: "Code APE (Activité Principale) manquant." };
    }

    const cleanApe = ape.toUpperCase().replace(/\s/g, '');
    const cleanName = (clubName || '').toUpperCase();

    // 1. Explicit Rejects (Exclusion List)
    const hasExclusion = NON_FOOTBALL_KEYWORDS.some(keyword => {
        const cleanKeyword = keyword.toUpperCase();
        // Exact word match for short keywords etc to avoid false positives
        if (cleanKeyword.length <= 4 && !cleanKeyword.includes(' ')) {
            const nameWords = cleanName.split(/[\s'-]+/);
            return nameWords.includes(cleanKeyword);
        }
        return cleanName.includes(cleanKeyword);
    });

    if (hasExclusion) {
        return { isValid: false, reason: "Ce club semble pratiquer un autre sport que le football (détecté via mots-clés d'exclusion)." };
    }

    // Special check for T.C. (Tennis Club)
    if (cleanName.includes('T.C.')) {
        return { isValid: false, reason: "Les clubs de Tennis ne sont pas autorisés." };
    }

    // 2. Check allowed APE codes
    const isCode93 = cleanApe.startsWith('93');
    const isCode8551 = cleanApe === '85.51Z' || cleanApe === '8551Z';
    const isCode9499 = cleanApe === '94.99Z' || cleanApe === '9499Z';

    if (!isCode93 && !isCode8551 && !isCode9499) {
        return { isValid: false, reason: `Code APE (${ape}) non autorisé pour un club de foot.` };
    }

    // 3. Keyword filtering specifically for 94.99Z (Assoc. divers)
    // REVISED: We now allow all club names for 94.99Z, as long as they are not explicitly excluded.
    // This avoids blocking clubs with atypical names (e.g., "KduFoot") while maintaining sports entity verification via APE.
    
    return { isValid: true };
}
