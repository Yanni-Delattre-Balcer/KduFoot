export const ContactStatus = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REFUSED: 'refused',
    WITHDRAWN: 'withdrawn',
} as const;

export type ContactStatusType = (typeof ContactStatus)[keyof typeof ContactStatus];

export const MatchStatus = {
    ACTIVE: 'active',
    FOUND: 'found',
    EXPIRED: 'expired',
} as const;

export type MatchStatusType = (typeof MatchStatus)[keyof typeof MatchStatus];

export const MatchType = {
    MATCH: 'match',
    TOURNAMENT: 'tournament',
} as const;

export type MatchTypeValue = (typeof MatchType)[keyof typeof MatchType];
