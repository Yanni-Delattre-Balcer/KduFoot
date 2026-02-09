
import { Router } from './router';
import { Env } from '../types/env';
import { ExerciseService } from '../services/exercise.service';
import { CreateExerciseDto, UpdateExerciseDto } from '../types/exercise';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

export const setupExerciseRoutes = (router: Router, env: Env) => {
    const exerciseService = new ExerciseService(env.DB);

    // Search exercises
    router.get('/api/exercises', async (request: Request) => {
        // Requires READ scope?
        const permissionCheck = await checkPermission(request, env, Permission.EXERCISES_READ);
        if (!permissionCheck.hasPermission) {
            // Maybe allow public read for shared exercises?
            // For now detailed read requires auth
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const url = new URL(request.url);
        const filters = {
            search: url.searchParams.get('search') || undefined,
            category: url.searchParams.get('category') || undefined,
            level: url.searchParams.get('level') || undefined,
            theme: url.searchParams.get('theme') || undefined,
            userId: url.searchParams.get('userId') || undefined, // Filter by specific user
            limit: parseInt(url.searchParams.get('limit') || '20'),
            offset: parseInt(url.searchParams.get('offset') || '0'),
        };

        const result = await exerciseService.search(filters);
        return Response.json({ success: true, ...result });
    });

    // Get single exercise
    router.get('/api/exercises/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.EXERCISES_READ);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const exercise = await exerciseService.getById(params.id);
        if (!exercise) {
            return Response.json({ success: false, error: 'Exercise not found' }, { status: 404 });
        }

        return Response.json({ success: true, exercise });
    });

    // Create exercise
    router.post('/api/exercises', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.EXERCISES_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));

        // We need to resolve user_id from auth0_sub
        // Or we store auth0_sub in exercise? Schema says user_id (TEXT).
        // Usually user_id refers to our internal UUID from D1 users table in these migrations (see users.id)
        // So we need to look up the user first.
        // Optimization: Store internal ID in token claims? Or duplicate lookups?
        // Let's do a lookup for now.

        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        const dto = await request.json() as CreateExerciseDto;

        try {
            const exercise = await exerciseService.create(dbUser.id, dto);
            return Response.json({ success: true, exercise });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });

    // Update exercise
    router.put('/api/exercises/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.EXERCISES_UPDATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        const dto = await request.json() as UpdateExerciseDto;

        try {
            const exercise = await exerciseService.update(params.id, dbUser.id, dto);
            if (!exercise) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404 });
            return Response.json({ success: true, exercise });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });

    // Delete exercise
    router.delete('/api/exercises/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.EXERCISES_DELETE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        try {
            const success = await exerciseService.delete(params.id, dbUser.id);
            if (!success) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404 });
            return Response.json({ success: true });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });
};
