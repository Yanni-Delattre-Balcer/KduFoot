
import { D1Database } from '@cloudflare/workers-types';
import { User, CreateUserDto, UpdateUserDto } from '../types/user';
import { v4 as uuidv4 } from 'uuid';

/**
 * The 'Service' class is responsible for interacting with the database.
 * This keeps our routes clean and allows us to reuse the same logic
 * in different part of the application.
 */
export class UserService {
    // The constructor takes the D1 database instance provided by Cloudflare
    constructor(private db: D1Database) { }

    async getUserByAuth0Sub(sub: string): Promise<User | null> {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE auth0_sub = ?')
            .bind(sub)
            .first<User>();
        return this.parseUser(result);
    }

    async getUserById(id: string): Promise<User | null> {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(id)
            .first<User>();
        return this.parseUser(result);
    }

    public parseUser(user: User | null): User | null {
        if (!user) return null;
        const u = { ...user };
        if (typeof u.additional_sirets === 'string') {
            try {
                let parsed = JSON.parse(u.additional_sirets);
                if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Auto-heal double-stringified corruption
                u.additional_sirets = Array.isArray(parsed) ? parsed : [];
            } catch (_e) {
                u.additional_sirets = [];
            }
        } else if (!Array.isArray(u.additional_sirets)) {
            u.additional_sirets = [];
        }
        return u as User;
    }

    async createOrUpdateUser(dto: CreateUserDto): Promise<User> {
        const id = uuidv4();
        const calendar_token = uuidv4();
        
        // Use UPSERT (INSERT ... ON CONFLICT) to handle create or update in one call
        const result = await this.db.prepare(`
            INSERT INTO users (id, auth0_sub, email, firstname, lastname, subscription, calendar_token, updated_at)
            VALUES (?, ?, ?, ?, ?, 'Free', ?, unixepoch())
            ON CONFLICT(auth0_sub) DO UPDATE SET
                email = EXCLUDED.email,
                firstname = EXCLUDED.firstname,
                lastname = EXCLUDED.lastname,
                updated_at = unixepoch()
            RETURNING *
        `).bind(id, dto.auth0_sub, dto.email, dto.firstname, dto.lastname, calendar_token).first<User>();

        return this.parseUser(result)!;
    }

    async updateUser(id: string, dto: UpdateUserDto): Promise<User | null> {
        /**
         * Construct a dynamic UPDATE query.
         * Since we don't know which fields the user wants to update (email? name?),
         * we build the SQL string programmatically.
         */
        const allowedKeys = [
            'firstname', 'lastname', 'club_id', 'siret', 'location', 
            'phone', 'license_id', 'category', 'level', 'pitch_type', 
            'home_jersey_color', 'away_jersey_color', 'stadium_address', 
            'latitude', 'longitude', 'picture', 'subscription', 
            'additional_sirets', 'calendar_token', 'push_subscription', 
            'has_synced_calendar', 'last_calendar_sync_at', 'block_count', 
            'siret_change_count'
        ] as const;

        const keys = Object.keys(dto).filter(k => allowedKeys.includes(k as typeof allowedKeys[number])) as (keyof UpdateUserDto)[];
        if (keys.length === 0) return this.getUserById(id);

        const setClause = keys.map((key) => `${key} = ?`).join(', ');
        const values = keys.map((key) => {
            const val = dto[key];
            if (key === 'additional_sirets' && typeof val === 'object' && val !== null) {
                return JSON.stringify(val);
            }
            return val;
        });

        // Add updated_at
        const query = `UPDATE users SET ${setClause}, updated_at = unixepoch() WHERE id = ? RETURNING *`;

        const result = await this.db
            .prepare(query)
            .bind(...values, id)
            .first<User>();

        return this.parseUser(result);
    }
    async setBlockedStatus(id: string, isBlocked: boolean, reason?: string): Promise<boolean> {
        if (isBlocked) {
            // 1. Delete all matches owned by this user (cascade: contacts/pairings cleaned by FK)
            await this.db.prepare('UPDATE matches SET deleted_at = CURRENT_TIMESTAMP WHERE owner_id = ?').bind(id).run();

            // 2. Delete all match contacts where the blocked user is the requester
            await this.db.prepare('DELETE FROM match_contacts WHERE user_id = ?').bind(id).run();

            // 3. Block the user and store the reason
            const result = await this.db
                .prepare('UPDATE users SET is_blocked = 1, block_reason = ? WHERE id = ?')
                .bind(reason || 'Aucun motif spécifié', id)
                .run();
            return result.success;
        } else {
            // Unblock: clear reason
            const result = await this.db
                .prepare('UPDATE users SET is_blocked = 0, block_reason = NULL WHERE id = ?')
                .bind(id)
                .run();
            return result.success;
        }
    }

    async getOrCreateCalendarToken(userId: string): Promise<string> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');
        if (user.calendar_token) return user.calendar_token;

        const newToken = uuidv4();
        await this.db
            .prepare('UPDATE users SET calendar_token = ? WHERE id = ?')
            .bind(newToken, userId)
            .run();
        return newToken;
    }

    async regenerateCalendarToken(userId: string): Promise<void> {
        const newToken = crypto.randomUUID();
        await this.db.prepare('UPDATE users SET calendar_token = ?, updated_at = unixepoch() WHERE id = ?').bind(newToken, userId).run();
    }

    async getUserByCalendarToken(token: string): Promise<User | null> {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE calendar_token = ?')
            .bind(token)
            .first<User>();
        return this.parseUser(result);
    }

    async deleteUser(id: string): Promise<boolean> {
        // [RGPD] Surgical Anonymization & Purge
        // 1. Anonymize matches (Keep the content but break the PII link)
        const anonymizeMatches = this.db.prepare(`
            UPDATE matches 
            SET owner_id = NULL, 
                email = 'deleted-internal@kdufoot.com', 
                phone = 'DELETED',
                notes = 'Contenu anonymisé suite à suppression de compte.'
            WHERE owner_id = ?
        `).bind(id);

        // 2. Anonymize Exercises
        const anonymizeExercises = this.db.prepare('UPDATE exercises SET user_id = NULL WHERE user_id = ?').bind(id);

        // 3. Anonymize Match Contacts (Participations)
        const anonymizeContacts = this.db.prepare('UPDATE match_contacts SET user_id = NULL WHERE user_id = ?').bind(id);

        // 4. Hard Delete Private Data (GDPR Requirement)
        const deleteSessions = this.db.prepare('DELETE FROM training_sessions WHERE user_id = ?').bind(id);
        const deleteHistory = this.db.prepare('DELETE FROM history WHERE user_id = ?').bind(id);
        const deleteFavorites = this.db.prepare('DELETE FROM favorites WHERE user_id = ?').bind(id);

        // 5. Audit the deletion before the user record vanishes
        const auditDeletion = this.db.prepare(`
            INSERT INTO rgpd_audit_log (id, user_id, action, details) 
            VALUES (?, ?, 'delete', 'Purge chirurgicale et anonymisation effectuée')
        `).bind(crypto.randomUUID(), id);

        // 6. Finally delete the user
        const deleteUser = this.db.prepare('DELETE FROM users WHERE id = ?').bind(id);

        // Execute as a Batch (Atomic Operation)
        const results = await this.db.batch([
            anonymizeMatches,
            anonymizeExercises,
            anonymizeContacts,
            deleteSessions,
            deleteHistory,
            deleteFavorites,
            auditDeletion,
            deleteUser
        ]);

        return results.every(res => res.success);
    }

    async updateLastCalendarSyncAt(userId: string): Promise<void> {
        await this.db
            .prepare('UPDATE users SET last_calendar_sync_at = unixepoch() WHERE id = ?')
            .bind(userId)
            .run();
    }

    async exportUserData(userId: string): Promise<Record<string, unknown>> {
        // Prepare queries for all user-related data
        const profileQuery = this.db.prepare('SELECT * FROM users WHERE id = ?').bind(userId);
        const matchesQuery = this.db.prepare('SELECT * FROM matches WHERE owner_id = ? AND deleted_at IS NULL ORDER BY match_date DESC LIMIT 50').bind(userId);
        const participationsQuery = this.db.prepare('SELECT * FROM match_contacts WHERE user_id = ? ORDER BY contacted_at DESC LIMIT 50').bind(userId);
        const sessionsQuery = this.db.prepare('SELECT * FROM training_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(userId);
        const exercisesQuery = this.db.prepare('SELECT * FROM exercises WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(userId);
        const auditQuery = this.db.prepare('SELECT * FROM rgpd_audit_log WHERE user_id = ? ORDER BY rowid DESC LIMIT 50').bind(userId);

        const results = await this.db.batch([
            profileQuery,
            matchesQuery,
            participationsQuery,
            sessionsQuery,
            exercisesQuery,
            auditQuery
        ]);

        return {
            profile: this.parseUser(results[0].results[0] as unknown as User),
            matches: results[1].results,
            match_applications: results[2].results,
            training_sessions: results[3].results,
            created_exercises: results[4].results,
            audit_log: results[5].results,
            exported_at: Math.floor(Date.now() / 1000)
        };
    }
}
