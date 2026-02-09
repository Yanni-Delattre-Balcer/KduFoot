
import { D1Database } from '@cloudflare/workers-types';
import { TrainingSession, SessionExercise, CreateSessionDto, UpdateSessionDto, SessionFilters } from '../types/session';
import { Exercise } from '../types/exercise';
import { v4 as uuidv4 } from 'uuid';

export class SessionService {
    constructor(private db: D1Database) { }

    async create(userId: string, dto: CreateSessionDto): Promise<TrainingSession> {
        const id = uuidv4();
        const now = Math.floor(Date.now() / 1000);
        const constraintsJson = dto.constraints ? JSON.stringify(dto.constraints) : null;

        // D1 doesn't support full transactions in the same way as better-sqlite3 synchronously, 
        // but supports batching. However, for a create with dependent inserts, we might need manual handling 
        // or use batch if we can generate IDs.
        // We already generated session ID.

        const sessionInsert = this.db.prepare(
            `INSERT INTO training_sessions (
        id, user_id, name, category, level, total_duration, constraints, status, scheduled_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, userId, dto.name, dto.category || null, dto.level || null, dto.total_duration || null,
            constraintsJson, dto.status || 'draft', dto.scheduled_date || null, now, now
        );

        const exerciseInserts = (dto.exercises || []).map(ex => {
            const adaptedJson = ex.adapted_data ? JSON.stringify(ex.adapted_data) : null;
            return this.db.prepare(
                `INSERT INTO session_exercises (
          session_id, exercise_id, order_index, duration, players, adapted_data
        ) VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(id, ex.exercise_id, ex.order_index, ex.duration, ex.players, adaptedJson);
        });

        await this.db.batch([sessionInsert, ...exerciseInserts]);

        // Return the created session (basic info, usually we might want full join but let's return basic first)
        // Or fetch it back
        return {
            id, user_id: userId, name: dto.name, category: dto.category, level: dto.level,
            total_duration: dto.total_duration, constraints: constraintsJson || undefined,
            status: dto.status || 'draft', scheduled_date: dto.scheduled_date,
            created_at: now, updated_at: now
        };
    }

    async getById(id: string): Promise<{ session: TrainingSession, exercises: SessionExercise[] } | null> {
        const session = await this.db.prepare('SELECT * FROM training_sessions WHERE id = ?').bind(id).first<TrainingSession>();
        if (!session) return null;

        // Fetch exercises
        // We also want to join with exercises table to get details
        // D1 join syntax is standard SQL
        const { results } = await this.db.prepare(
            `SELECT 
            se.session_id, se.exercise_id, se.order_index, se.duration as se_duration, se.players as se_players, se.adapted_data,
            e.id as e_id, e.user_id as e_user_id, e.title, e.synopsis, e.svg_schema, e.themes, 
            e.nb_joueurs, e.dimensions, e.materiel, e.category, e.level, e.duration as e_duration,
            e.video_url, e.thumbnail_url, e.video_start_seconds, e.created_at as e_created_at, e.updated_at as e_updated_at
         FROM session_exercises se 
         JOIN exercises e ON se.exercise_id = e.id 
         WHERE se.session_id = ? 
         ORDER BY se.order_index ASC`
        ).bind(id).all();

        // Map results to SessionExercise structure with embedded Exercise
        // NOTE: SELECT * from joined tables will collide on ID and other fields.
        // Proper way requires explicit column aliasing or careful extraction.
        // For simplicity, let's assume raw results containing all columns.
        // But since 'id' collides, 'exercises.id' might overwrite 'session_exercises... wait session_exercises has composite PK, no single ID.
        // Exercises has ID.

        // Better query: select se specific columns, and e specific columns?
        // Or just 2 queries if we want clean types. Or aliasing.

        const exercises: SessionExercise[] = results.map((row: any) => {
            // Construct Exercise object
            const exercise: Exercise = {
                id: row.e_id,
                user_id: row.e_user_id,
                title: row.title,
                synopsis: row.synopsis,
                svg_schema: row.svg_schema,
                themes: row.themes,
                created_at: row.e_created_at,
                updated_at: row.e_updated_at,
                // ... map other fields
                nb_joueurs: row.nb_joueurs,
                dimensions: row.dimensions,
                materiel: row.materiel,
                category: row.category,
                level: row.level,
                duration: row.e_duration, // careful with name collision if both have duration
                video_url: row.video_url,
                thumbnail_url: row.thumbnail_url,
                video_start_seconds: row.video_start_seconds
            };

            return {
                session_id: row.session_id,
                exercise_id: row.exercise_id,
                order_index: row.order_index,
                duration: row.se_duration, // this is session_exercise duration
                players: row.se_players,
                adapted_data: row.adapted_data,
                exercise
            };
        });

        return { session, exercises };
    }

    async update(id: string, userId: string, dto: UpdateSessionDto): Promise<boolean> {
        const existing = await this.db.prepare('SELECT user_id FROM training_sessions WHERE id = ?').bind(id).first<{ user_id: string }>();
        if (!existing) return false;
        if (existing.user_id !== userId) throw new Error('Unauthorized');

        const now = Math.floor(Date.now() / 1000);
        const statements: any[] = [];

        // Update main session fields
        const keys = Object.keys(dto).filter(k => k !== 'exercises') as (keyof UpdateSessionDto)[];
        if (keys.length > 0) {
            const setClauses: string[] = [];
            const values: any[] = [];
            for (const key of keys) {
                if (key === 'constraints') {
                    setClauses.push(`constraints = ?`);
                    values.push(JSON.stringify(dto.constraints));
                } else {
                    setClauses.push(`${key} = ?`);
                    values.push(dto[key]);
                }
            }
            setClauses.push(`updated_at = ?`);
            values.push(now);

            statements.push(
                this.db.prepare(`UPDATE training_sessions SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id)
            );
        }

        // Update exercises if provided
        if (dto.exercises) {
            // DELETE existing and re-create? Or merge?
            // Full replacement is easiest for order and consistency provided client sends full list.
            statements.push(this.db.prepare('DELETE FROM session_exercises WHERE session_id = ?').bind(id));

            for (const ex of dto.exercises) {
                const adaptedJson = ex.adapted_data ? JSON.stringify(ex.adapted_data) : null;
                statements.push(this.db.prepare(
                    `INSERT INTO session_exercises (
                  session_id, exercise_id, order_index, duration, players, adapted_data
                ) VALUES (?, ?, ?, ?, ?, ?)`
                ).bind(id, ex.exercise_id, ex.order_index, ex.duration, ex.players, adaptedJson));
            }
        } else {
            // If query strictly didn't contain exercises, do we touch updated_at? Yes, done above.
        }

        if (statements.length > 0) {
            await this.db.batch(statements);
        }

        return true;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const existing = await this.db.prepare('SELECT user_id FROM training_sessions WHERE id = ?').bind(id).first<{ user_id: string }>();
        if (!existing) return false;
        if (existing.user_id !== userId) throw new Error('Unauthorized');

        await this.db.prepare('DELETE FROM training_sessions WHERE id = ?').bind(id).run();
        return true;
    }

    async search(filters: SessionFilters): Promise<{ sessions: TrainingSession[], total: number }> {
        let query = 'SELECT * FROM training_sessions WHERE 1=1';
        const params: any[] = [];

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        // Date range
        if (filters.from) {
            query += ' AND scheduled_date >= ?';
            params.push(filters.from);
        }
        if (filters.to) {
            query += ' AND scheduled_date <= ?';
            params.push(filters.to);
        }

        query += ' ORDER BY scheduled_date ASC, created_at DESC'; // Upcoming first?

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }
        if (filters.offset) {
            query += ' OFFSET ?';
            params.push(filters.offset);
        }

        const { results } = await this.db.prepare(query).bind(...params).all<TrainingSession>();
        return { sessions: results, total: results.length };
    }
}
