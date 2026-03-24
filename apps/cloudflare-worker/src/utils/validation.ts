import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates that a route param is a well-formed UUID (v4). */
export function isValidUUID(id: string | undefined): id is string {
    return !!id && UUID_REGEX.test(id);
}

/** Returns a 400 guard helper for UUID params. */
export function requireValidUUID(id: string | undefined, corsHeaders: Record<string, string>): Response | null {
    if (!isValidUUID(id)) {
        return Response.json({ success: false, error: 'Invalid ID format' }, { status: 400, headers: corsHeaders });
    }
    return null;
}

/**
 * Schema for match/tournament creation
 */
export const CreateMatchSchema = z.object({
  club_id: z.string().min(1),
  type: z.enum(['match', 'tournament']).optional(),
  name: z.string().min(2).max(100).optional(),
  category: z.string().min(1),
  level: z.string().min(1),
  format: z.enum(['11v11', '8v8', '7v7', '5v5', 'Futsal']),
  match_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  match_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  match_end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  venue: z.enum(['Domicile', 'Extérieur']),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_zip: z.string().optional(),
  pitch_type: z.string().optional(),
  jersey_color: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(10),
  notes: z.string().max(500).optional(),
  max_teams: z.number().int().min(2).max(64).optional(),
  registration_fee: z.number().min(0).optional(),
});

/**
 * Schema for match/tournament update
 */
export const UpdateMatchSchema = CreateMatchSchema.partial().extend({
  status: z.enum(['active', 'found', 'expired']).optional(),
});

/**
 * Schema for contact request
 */
export const ContactMatchSchema = z.object({
  message: z.string().min(1).max(500),
});

/**
 * Schema for score update
 */
export const UpdateScoreSchema = z.object({
  score_a: z.number().int().min(0),
  score_b: z.number().int().min(0),
});
