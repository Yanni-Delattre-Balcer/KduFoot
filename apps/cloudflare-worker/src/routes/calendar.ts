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

        // Unique set of match IDs
        const matchMap = new Map<string, any>();

        // Organized matches
        owned.matches.forEach(m => matchMap.set(m.id, m));

        // Participations (only accepted)
        participations.forEach(p => {
            if (p.status === 'accepted' || p.request_status === 'accepted') {
                matchMap.set(p.match_id || p.id, p);
            }
        });

        const items = Array.from(matchMap.values());

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//KduFoot//Calendar Sync//FR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:KduFoot - Mes Matchs',
            'X-WR-TIMEZONE:Europe/Paris'
        ];

        for (const item of items) {
            const date = item.match_date;
            const time = item.match_time;
            if (!date || !time) continue;

            const type = item.match_type || item.type || 'Match';
            const name = item.name || (type === 'tournament' ? 'Tournoi' : 'Match');
            const category = item.category || item.match_category || 'N/A';
            const level = item.level || item.match_level || '';
            const venue = item.venue;
            
            let location = '';
            if (venue === 'Domicile') {
                location = item.stadium_address || item.location_address || '';
            } else {
                 location = item.location_address || item.stadium_address || '';
            }
            if (item.location_city) location += (location ? ', ' : '') + item.location_city;

            const summary = `${name} - ${category} ${level}`.trim();
            const description = `Type: ${type}\nCatégorie: ${category}\nNiveau: ${level || 'N/A'}\nLieu: ${venue}\n\nAccédez à vos détails sur KduFoot.`;

            const dateParts = date.split('-');
            const timeParts = time.split(':');
            const dtStart = `${dateParts.join('')}T${timeParts.join('')}00`;
            
            const endHour = (parseInt(timeParts[0]) + 2).toString().padStart(2, '0');
            const dtEnd = `${dateParts.join('')}T${endHour}${timeParts[1]}00`;

            const uid = `match-${item.id || item.match_id}@kdufoot.com`;

            ics.push(
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                `DTSTART;TZID=Europe/Paris:${dtStart}`,
                `DTEND;TZID=Europe/Paris:${dtEnd}`,
                `SUMMARY:${summary}`,
                `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
                `LOCATION:${location}`,
                'BEGIN:VALARM',
                'TRIGGER:-P1D', 
                'ACTION:DISPLAY',
                `DESCRIPTION:Rappel: ${summary} demain`,
                'END:VALARM',
                'BEGIN:VALARM',
                'TRIGGER:-PT4H',
                'ACTION:DISPLAY',
                `DESCRIPTION:Rappel: ${summary} aujourd'hui (4h)`,
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
