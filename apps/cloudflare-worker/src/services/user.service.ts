
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

    private parseUser(user: any): User | null {
        if (!user) return null;
        if (typeof user.additional_sirets === 'string') {
            try {
                let parsed = JSON.parse(user.additional_sirets);
                if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Auto-heal double-stringified corruption
                user.additional_sirets = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                user.additional_sirets = [];
            }
        } else if (!Array.isArray(user.additional_sirets)) {
            user.additional_sirets = [];
        }
        return user as User;
    }

    async createOrUpdateUser(dto: CreateUserDto): Promise<User> {
        const existing = await this.getUserByAuth0Sub(dto.auth0_sub);

        if (existing) {
            // Update basic info on login if needed (e.g. email change? mainly updated_at)
            const updated = await this.db
                .prepare('UPDATE users SET updated_at = unixepoch() WHERE id = ? RETURNING *')
                .bind(existing.id)
                .first<User>();
            return this.parseUser(updated)!;
        }

        // Create new user
        const id = uuidv4();
        const calendar_token = uuidv4();
        const result = await this.db
            .prepare(
                `INSERT INTO users (
          id, auth0_sub, email, firstname, lastname, subscription, calendar_token
        ) VALUES (
          ?, ?, ?, ?, ?, 'Free', ?
        ) RETURNING *`
            )
            .bind(id, dto.auth0_sub, dto.email, dto.firstname, dto.lastname, calendar_token)
            .first<User>();

        return this.parseUser(result)!;
    }

    async updateUser(id: string, dto: UpdateUserDto): Promise<User | null> {
        /**
         * Construct a dynamic UPDATE query.
         * Since we don't know which fields the user wants to update (email? name?),
         * we build the SQL string programmatically.
         */
        const keys = Object.keys(dto) as (keyof UpdateUserDto)[];
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
            await this.db.prepare('DELETE FROM matches WHERE owner_id = ?').bind(id).run();

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

    async getUserByCalendarToken(token: string): Promise<User | null> {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE calendar_token = ?')
            .bind(token)
            .first<User>();
        return this.parseUser(result);
    }

    async deleteUser(id: string): Promise<boolean> {
        const result = await this.db
            .prepare('DELETE FROM users WHERE id = ?')
            .bind(id)
            .run();
        return result.success;
    }
}
