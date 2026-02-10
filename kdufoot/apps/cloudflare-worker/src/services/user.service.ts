
import { D1Database } from '@cloudflare/workers-types';
import { User, CreateUserDto, UpdateUserDto } from '../types/user';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
    constructor(private db: D1Database) { }

    async getUserByAuth0Sub(sub: string): Promise<User | null> {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE auth0_sub = ?')
            .bind(sub)
            .first<User>();
        return result || null;
    }

    async getUserById(id: string): Promise<User | null> {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(id)
            .first<User>();
        return result || null;
    }

    async createOrUpdateUser(dto: CreateUserDto): Promise<User> {
        const existing = await this.getUserByAuth0Sub(dto.auth0_sub);

        if (existing) {
            // Update basic info on login if needed (e.g. email change? mainly updated_at)
            // For now, we just return the existing user to be safe, or maybe update last login time if we tracked it.
            // Let's just update `updated_at`.
            const updated = await this.db
                .prepare('UPDATE users SET updated_at = unixepoch() WHERE id = ? RETURNING *')
                .bind(existing.id)
                .first<User>();
            return updated!;
        }

        // Create new user
        const id = uuidv4();
        const result = await this.db
            .prepare(
                `INSERT INTO users (
          id, auth0_sub, email, firstname, lastname, subscription
        ) VALUES (
          ?, ?, ?, ?, ?, 'Free'
        ) RETURNING *`
            )
            .bind(id, dto.auth0_sub, dto.email, dto.firstname, dto.lastname)
            .first<User>();

        return result!;
    }

    async updateUser(id: string, dto: UpdateUserDto): Promise<User | null> {
        // Construct dynamic update query
        const keys = Object.keys(dto) as (keyof UpdateUserDto)[];
        if (keys.length === 0) return this.getUserById(id);

        const setClause = keys.map((key) => `${key} = ?`).join(', ');
        const values = keys.map((key) => dto[key]);

        // Add updated_at
        const query = `UPDATE users SET ${setClause}, updated_at = unixepoch() WHERE id = ? RETURNING *`;

        const result = await this.db
            .prepare(query)
            .bind(...values, id)
            .first<User>();

        return result || null;
    }
}
