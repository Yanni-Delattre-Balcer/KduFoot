import { D1Database } from '@cloudflare/workers-types';

interface DbUser {
    id: string;
    firstname: string;
    lastname: string;
    phone: string;
    license_id: string;
    category: string;
    level: string;
    stadium_address: string;
    club_id: string;
    auth0_sub: string;
    email: string;
}

/**
 * Resolve an Auth0 sub to the full D1 user row.
 * Returns null when the sub is missing or the user does not exist.
 */
export async function getDbUser(db: D1Database, auth0Sub: string | undefined): Promise<DbUser | null> {
    if (!auth0Sub) return null;
    return db.prepare(
        'SELECT id, firstname, lastname, phone, license_id, category, level, stadium_address, club_id, auth0_sub, email FROM users WHERE auth0_sub = ?'
    ).bind(auth0Sub).first<DbUser>();
}
