
import { D1Database } from '@cloudflare/workers-types';
import { Exercise, CreateExerciseDto, UpdateExerciseDto, ExerciseFilters } from '../types/exercise';
import { v4 as uuidv4 } from 'uuid';

export class ExerciseService {
    constructor(private db: D1Database) { }

    async create(userId: string, dto: CreateExerciseDto): Promise<Exercise> {
        const id = uuidv4();
        const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds for D1

        // Convert array to JSON string
        const themesJson = JSON.stringify(dto.themes || []);

        const result = await this.db
            .prepare(
                `INSERT INTO exercises (
          id, user_id, title, synopsis, svg_schema, themes, 
          nb_joueurs, dimensions, materiel, category, level, 
          duration, video_url, thumbnail_url, video_start_seconds, 
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, 
          ?, ?
        ) RETURNING *`
            )
            .bind(
                id, userId, dto.title, dto.synopsis || null, dto.svg_schema || null, themesJson,
                dto.nb_joueurs || null, dto.dimensions || null, dto.materiel || null, dto.category || null, dto.level || null,
                dto.duration || null, dto.video_url || null, dto.thumbnail_url || null, dto.video_start_seconds || null,
                now, now
            )
            .first<Exercise>();

        return result!;
    }

    async update(id: string, userId: string, dto: UpdateExerciseDto): Promise<Exercise | null> {
        // Check ownership
        const existing = await this.getById(id);
        if (!existing) return null;
        if (existing.user_id !== userId) throw new Error('Unauthorized');

        const keys = Object.keys(dto) as (keyof UpdateExerciseDto)[];
        if (keys.length === 0) return existing;

        const setClauses: string[] = [];
        const values: any[] = [];

        for (const key of keys) {
            if (key === 'themes') {
                setClauses.push(`themes = ?`);
                values.push(JSON.stringify(dto.themes));
            } else {
                setClauses.push(`${key} = ?`);
                values.push(dto[key]);
            }
        }

        setClauses.push(`updated_at = ?`);
        values.push(Math.floor(Date.now() / 1000));

        const query = `UPDATE exercises SET ${setClauses.join(', ')} WHERE id = ? RETURNING *`;

        const result = await this.db
            .prepare(query)
            .bind(...values, id)
            .first<Exercise>();

        return result;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const existing = await this.getById(id);
        if (!existing) return false;
        if (existing.user_id !== userId) throw new Error('Unauthorized');

        await this.db.prepare('DELETE FROM exercises WHERE id = ?').bind(id).run();
        return true;
    }

    async getById(id: string): Promise<Exercise | null> {
        return await this.db.prepare('SELECT * FROM exercises WHERE id = ?').bind(id).first<Exercise>();
    }

    async search(filters: ExerciseFilters): Promise<{ exercises: Exercise[]; total: number }> {
        let query = 'SELECT * FROM exercises WHERE 1=1';
        const params: any[] = [];

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        if (filters.search) {
            query += ' AND (title LIKE ? OR synopsis LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.category) {
            query += ' AND category = ?';
            params.push(filters.category);
        }

        if (filters.level) {
            query += ' AND level = ?';
            params.push(filters.level);
        }

        // Theme filtering is harder with JSON string in SQLite without JSON extension guarantee
        // But Cloudflare D1 supports JSON extraction: json_extract(themes, '$')
        // A simple LIKE might be enough for array of strings if formatted consistently
        if (filters.theme) {
            query += ' AND themes LIKE ?';
            params.push(`%${filters.theme}%`);
        }

        // Count total before pagination
        // Note: This is an approximation or requires a separate count query
        // For simplicity, we'll just fetch results with limit

        query += ' ORDER BY created_at DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        if (filters.offset) {
            query += ' OFFSET ?';
            params.push(filters.offset);
        }

        const { results } = await this.db.prepare(query).bind(...params).all<Exercise>();

        return { exercises: results, total: results.length }; // Total is partial here, ideally proper count
    }
}
