import { Router } from './router';
import { Env } from '../types/env';
import { MatchService } from '../services/match.service';
import { UserService } from '../services/user.service';

export const setupCalendarRoutes = (router: Router, env: Env) => {
    /**
     * @openapi
     * /api/calendar/<token>.ics:
     *   get:
     *     tags:
     *       - Calendar
     *     summary: Fetch iCalendar feed for a user
     *     parameters:
     *       - name: token
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: iCalendar file
     *       404:
     *         description: Invalid token
     */
    router.get('/api/calendar/<token>.ics', async (request, env) => {
        const { token } = request.params;
        const userService = new UserService(env.DB);
        const matchService = new MatchService(env.DB);

        const user = await userService.getUserByCalendarToken(token);
        if (!user) {
            return new Response('Invalid token', { status: 404, headers: router.corsHeaders });
        }

        // Fetch matches (organized or as accepted participant)
        // Note: For organized matches, we use search.
        const [incoming, participations, owned] = await Promise.all([
            matchService.getIncomingRequests(user.id),
            matchService.getMyParticipations(user.id),
            matchService.search({ ownerId: user.id })
        ]);

        // Match items to include in calendar
        const matchMap = new Map<string, any>();

        // 1. Confirmed matches / teams where I am the HOST
        incoming.forEach(r => {
            if (r.status === 'accepted' || r.request_status === 'accepted') {
                matchMap.set(r.match_id, {
                    ...r,
                    opponentName: r.requester_club_name
                });
            }
        });

        // 2. Confirmed matches / teams where I am the GUEST
        participations.forEach(p => {
            if (p.status === 'accepted' || p.request_status === 'accepted') {
                matchMap.set(p.match_id || p.id, {
                    ...p,
                    opponentName: p.host_club_name
                });
            }
        });

        // 3. Tournaments I ORGANIZED (always visible)
        owned.matches.forEach(m => {
            if (m.type === 'tournament') {
                // Don't overwrite if already set via participation logic (though unlikely to be host and guest)
                if (!matchMap.has(m.id)) {
                    matchMap.set(m.id, m);
                }
            }
        });

        const items = Array.from(matchMap.values()).filter(m => {
            const isCancelled = m.status === 'cancelled' || m.match_status === 'cancelled';
            if (isCancelled) return false;

            const type = m.match_type || m.type || 'match';
            
            // For tournaments, we show them as soon as they are created
            if (type === 'tournament') return true;

            // For matches, we only show them if they are confirmed
            // At this point, everything in the map for 'match' type should be confirmed
            // because of the filters above, but let's be safe.
            const status = m.match_status || m.status || m.request_status;
            return status === 'found' || status === 'accepted';
        });

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//KduFoot//Calendar Sync//FR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:KduFoot - Mes Matchs/Tournois',
            'X-WR-TIMEZONE:Europe/Paris'
        ];

        for (const item of items) {
            const date = item.match_date;
            const time = item.match_time;
            if (!date || !time) continue;

            const typeRaw = item.match_type || item.type || 'Match';
            const typeLabel = typeRaw === 'tournament' ? 'Tournoi' : 'Match';
            const category = item.category || item.match_category || '';
            const level = item.level || item.match_level || '';
            const venue = item.venue || 'N/A';

            // --- Location & Deduplication ---
            let baseAddress = venue === 'Domicile'
                ? (item.stadium_address || item.location_address || '')
                : (item.location_address || item.stadium_address || '');

            const city = (item.location_city || '').trim();
            let location = baseAddress.trim();

            if (city && !location.toLowerCase().includes(city.toLowerCase())) {
                location += (location ? ', ' : '') + city;
            }

            // --- Titre ---
            // Tournoi → "Kdufoot : [nom du tournoi]"
            // Match  → "Kdufoot : Match contre [nom du club adverse]"
            let summary = '';
            if (typeRaw === 'tournament') {
                const tournamentName = item.name || 'Sans nom';
                summary = `Kdufoot : ${tournamentName}`;
            } else {
                const opponentName = item.opponentName || item.host_club_name || item.requester_club_name || item.club_name || 'Adversaire';
                summary = `Kdufoot : Match contre ${opponentName}`;
            }

            // --- Lien GPS Google Maps ---
            const encodedAddress = encodeURIComponent(location || 'France');
            const gpsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

            // --- Lien Kdufoot ---
            const kduFootUrl = 'https://kdufoot.com';
            const matchDetailUrl = `${kduFootUrl}/matches/${item.id || item.match_id}`;

            // --- Description enrichie (Plain text & HTML) ---
            // Plain text description: avoid raw URLs where possible, but provide the GPS link separately for compatibility
            const descLines = [
                `Type : ${typeLabel}`,
                `Catégorie : ${category || 'N/A'}`,
                `Niveau : ${level || 'N/A'}`,
                `Lieu : ${location || 'N/A'}`,
                `Position : ${venue}`,
                `Lien GPS : ${gpsLink}`,
                `Détails : ${matchDetailUrl}`,
            ];
            const description = descLines.join('\\n');

            const htmlDescription = [
                '<html><body>',
                `<p><b>Événement Kdufoot</b></p>`,
                `Type : <b>${typeLabel}</b><br>`,
                `Catégorie : ${category || 'N/A'}<br>`,
                `Niveau : ${level || 'N/A'}<br>`,
                `Lieu : <a href="${gpsLink}"><b>${location || 'N/A'}</b></a><br>`,
                `Position : ${venue}<br><br>`,
                `<a href="${matchDetailUrl}">Voir l'annonce sur le site</a>`,
                '</body></html>'
            ].join('');

            // --- Dates ---
            const dateParts = date.split('-');
            const timeParts = time.split(':');
            const dtStart = `${dateParts.join('')}T${timeParts.join('')}00`;

            let dtEnd = '';
            if (typeRaw === 'tournament' && item.match_end_time) {
                // Tournois : utiliser l'heure de fin réelle
                const endTimeParts = item.match_end_time.split(':');
                dtEnd = `${dateParts.join('')}T${endTimeParts.join('')}00`;
            } else {
                // Matchs : durée fixe de 2 heures
                const startHour = parseInt(timeParts[0]);
                const startMin = parseInt(timeParts[1]);
                const endDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), startHour + 2, startMin);

                const endYear = endDate.getFullYear();
                const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
                const endDay = endDate.getDate().toString().padStart(2, '0');
                const endH = endDate.getHours().toString().padStart(2, '0');
                const endM = endDate.getMinutes().toString().padStart(2, '0');

                dtEnd = `${endYear}${endMonth}${endDay}T${endH}${endM}00`;
            }

            // UID stable = pas de doublons même si on re-synchronise
            const uid = `match-${item.id || item.match_id}@kdufoot.com`;

            ics.push(
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                `DTSTART;TZID=Europe/Paris:${dtStart}`,
                `DTEND;TZID=Europe/Paris:${dtEnd}`,
                `SUMMARY:${summary}`,
                `DESCRIPTION:${description}`,
                `X-ALT-DESC;FMTTYPE=text/html:${htmlDescription}`,
                `LOCATION:${location}`,
                `URL:${matchDetailUrl}`,
                'BEGIN:VALARM',
                'TRIGGER:-P1D',
                'ACTION:DISPLAY',
                `DESCRIPTION:Rappel: ${summary} demain`,
                'END:VALARM',
                'BEGIN:VALARM',
                'TRIGGER:-PT4H',
                'ACTION:DISPLAY',
                `DESCRIPTION:Rappel: ${summary} dans 4h`,
                'END:VALARM',
                'END:VEVENT'
            );
        }

        ics.push('END:VCALENDAR');

        return new Response(ics.join('\r\n'), {
            headers: {
                ...router.corsHeaders,
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="calendar.ics"'
            }
        });
    });
};
