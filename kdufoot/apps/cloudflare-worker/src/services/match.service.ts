
import { D1Database } from '@cloudflare/workers-types';
import { Match, CreateMatchDto, UpdateMatchDto, MatchFilters, ContactMatchDto } from '../types/match';
import { v4 as uuidv4 } from 'uuid';

export class MatchService {
    constructor(private db: D1Database) { }

    async create(userId: string, dto: CreateMatchDto): Promise<Match> {
        const id = uuidv4();
        const now = Math.floor(Date.now() / 1000);

        const result = await this.db.prepare(
            `INSERT INTO matches (
        id, owner_id, club_id, category, format, match_date, match_time, 
        venue, email, phone, notes, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, 'active', ?, ?
      ) RETURNING *`
        ).bind(
            id, userId, dto.club_id, dto.category, dto.format, dto.match_date, dto.match_time,
            dto.venue, dto.email, dto.phone, dto.notes || null, now, now
        ).first<Match>();

        return result!;
    }

    async update(id: string, userId: string, dto: UpdateMatchDto): Promise<Match | null> {
        const existing = await this.getById(id);
        if (!existing) return null;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');

        const keys = Object.keys(dto) as (keyof UpdateMatchDto)[];
        if (keys.length === 0) return existing;

        const setClauses: string[] = [];
        const values: any[] = [];
        for (const key of keys) {
            setClauses.push(`${key} = ?`);
            values.push(dto[key]);
        }
        setClauses.push(`updated_at = ?`);
        values.push(Math.floor(Date.now() / 1000));

        const query = `UPDATE matches SET ${setClauses.join(', ')} WHERE id = ? RETURNING *`;
        return await this.db.prepare(query).bind(...values, id).first<Match>();
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const existing = await this.getById(id);
        if (!existing) return false;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');

        await this.db.prepare('DELETE FROM matches WHERE id = ?').bind(id).run();
        return true;
    }

    async getById(id: string): Promise<Match | null> {
        return await this.db.prepare('SELECT * FROM matches WHERE id = ?').bind(id).first<Match>();
    }

    async search(filters: MatchFilters): Promise<{ matches: Match[], total: number }> {
        let query = 'SELECT * FROM matches WHERE 1=1';
        const params: any[] = [];

        if (filters.ownerId) {
            query += ' AND owner_id = ?';
            params.push(filters.ownerId);
        } else {
            // Public search: only active matches?
            // Or if status filter is provided
            if (filters.status) {
                query += ' AND status = ?';
                params.push(filters.status);
            } else {
                // Default to active only if not verifying own matches?
                // Usually search is for opponents, so active.
                // If implicit... let's stick to explicit filters.
            }
        }

        // If explicit status filter
        if (filters.status && !params.includes(filters.status)) { // Handle duplicate check logic if needed or just trust caller
            // logic above handles it
        }

        if (filters.category) {
            query += ' AND category = ?';
            params.push(filters.category);
        }
        if (filters.format) {
            query += ' AND format = ?';
            params.push(filters.format);
        }
        if (filters.venue) {
            query += ' AND venue = ?';
            params.push(filters.venue);
        }
        if (filters.date) {
            query += ' AND match_date = ?';
            params.push(filters.date);
        }
        if (filters.from) {
            query += ' AND match_date >= ?';
            params.push(filters.from);
        }
        if (filters.to) {
            query += ' AND match_date <= ?';
            params.push(filters.to);
        }

        query += ' ORDER BY match_date ASC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }
        if (filters.offset) {
            query += ' OFFSET ?';
            params.push(filters.offset);
        }

        const { results } = await this.db.prepare(query).bind(...params).all<Match>();
        return { matches: results, total: results.length };
    }

    async contact(matchId: string, userId: string, dto: ContactMatchDto): Promise<boolean> {
        // Check if match exists and is active
        const match = await this.getById(matchId);
        if (!match || match.status !== 'active') throw new Error('Match not available');
        if (match.owner_id === userId) throw new Error('Cannot contact own match');

        // Check if already contacted
        // Primary key (match_id, user_id)
        try {
            await this.db.prepare(
                'INSERT INTO match_contacts (match_id, user_id, message, contacted_at) VALUES (?, ?, ?, ?)'
            ).bind(matchId, userId, dto.message, Math.floor(Date.now() / 1000)).run();
            return true;
        } catch (e: any) {
            if (e.message.includes('UNIQUE constraint failed')) {
                return true; // Already contacted, treat as success or ignore
            }
            throw e;
        }
    }
}
