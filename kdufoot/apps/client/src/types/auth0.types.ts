/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

export interface Auth0User {
    user_id: string;
    email: string;
    email_verified: boolean;
    name: string;
    picture: string;
    nickname: string;
    created_at: string;
    updated_at: string;
    last_login: string;
    logins_count: number;
    app_metadata?: {
        permissions?: string[];
        subscription?: 'Free' | 'Pro' | 'Ultime';
    };
    user_metadata?: {
        club_id?: string;
        siret?: string;
    };
}

export interface Auth0Role {
    id: string;
    name: string;
    description: string;
}

export interface Auth0Permission {
    permission_name: string;
    description: string;
    resource_server_identifier: string;
    resource_server_name: string;
}
