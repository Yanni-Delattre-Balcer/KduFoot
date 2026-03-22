
import { Router } from './router';
import { Env } from '../types/env';
import { ExerciseService } from '../services/exercise.service';
import { CreateExerciseDto, UpdateExerciseDto } from '../types/exercise';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

export const setupExerciseRoutes = (router: Router, env: Env) => {
    const exerciseService = new ExerciseService(env.DB);

    /**
 * @openapi
 * /api/exercises:
 *   get:
 *     tags:
 *       - Exercises
 *     summary: Search for and filter exercises
 *     description: >
 *       Retrieves a paginated list of exercises, with optional filters for keyword search, category, target level, and theme.
 *       Requires the 'exercises:read' permission (scope).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: search
 *         in: query
 *         description: Keyword to find in title or description.
 *         schema: { type: string }
 *       - name: category
 *         in: query
 *         description: Specific category filter (e.g., Tactical).
 *         schema: { type: string }
 *       - name: level
 *         in: query
 *         description: Difficulty level filter.
 *         schema: { type: string }
 *       - name: theme
 *         in: query
 *         description: Specific theme filter (e.g., Finishing).
 *         schema: { type: string }
 *       - name: limit
 *         in: query
 *         description: Maximum number of results to return.
 *         schema: { type: integer, default: 20 }
 *       - name: offset
 *         in: query
 *         description: Number of results to skip for pagination.
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated search results.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 exercises: { type: array, items: { $ref: '#/components/schemas/Exercise' } }
 *                 total: { type: integer }
 *       403:
 *         description: Forbidden - Insufficient permissions.
 */
    router.get('/api/exercises', async (request, env) => {

        const url = new URL(request.url);
        const filters = {
            search: url.searchParams.get('search') || undefined,
            category: url.searchParams.get('category') || undefined,
            level: url.searchParams.get('level') || undefined,
            theme: url.searchParams.get('theme') || undefined,
            userId: url.searchParams.get('userId') || undefined, // Filter by specific user
            limit: parseInt(url.searchParams.get('limit') || '20'),
            cursor: url.searchParams.get('cursor') || undefined,
        };

        const result = await exerciseService.search(filters);
        return Response.json({ success: true, ...result }, { 
            headers: { 
                ...router.corsHeaders, 
                "Content-Type": "application/json",
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600"
            } 
        });
    }, Permission.EXERCISES_READ);

    /**
 * @openapi
 * /api/exercises/{id}:
 *   get:
 *     tags:
 *       - Exercises
 *     summary: Retrieve a detailed exercise by ID
 *     description: >
 *       Fetches the full details of a single exercise record.
 *       Requires the 'exercises:read' permission.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Unique UUID of the exercise.
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Successfully retrieved exercise details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 exercise: { $ref: '#/components/schemas/Exercise' }
 *       404:
 *         description: Not Found - Exercise ID does not exist.
 *       403:
 *         description: Forbidden - Access denied.
 */
    router.get('/api/exercises/<id>', async (request, env) => {
        const { id } = request.params;

        const cacheKey = `exercise:${id}`;
        if (env.KV_CACHE) {
            const cached = await env.KV_CACHE.get(cacheKey);
            if (cached) {
                return Response.json({ success: true, exercise: JSON.parse(cached), cached: true }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            }
        }

        const exercise = await exerciseService.getById(id);
        if (!exercise) {
            return Response.json({ success: false, error: 'Exercise not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        if (env.KV_CACHE) {
            await env.KV_CACHE.put(cacheKey, JSON.stringify(exercise), { expirationTtl: 3600 });
        }

        return Response.json({ success: true, exercise }, { 
            headers: { 
                ...router.corsHeaders, 
                "Content-Type": "application/json",
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
            } 
        });
    }, Permission.EXERCISES_READ);

    /**
 * @openapi
 * /api/exercises:
 *   post:
 *     tags:
 *       - Exercises
 *     summary: Create a new exercise drill
 *     description: >
 *       Saves a new exercise record to the database. The exercise is automatically associated with the authenticated user.
 *       Requires the 'exercises:create' permission.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Details of the exercise to be created.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Exercise'
 *     responses:
 *       200:
 *         description: Exercise successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 exercise: { $ref: '#/components/schemas/Exercise' }
 *       400:
 *         description: Bad Request - User profile not synchronized.
 *       403:
 *         description: Forbidden - Insufficient rights to create exercises.
 *       500:
 *         description: Internal Server Error - Failed to save the record.
 */
    router.post('/api/exercises', async (request, env) => {
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const dto = await request.json() as CreateExerciseDto;

        try {
            const exercise = await exerciseService.create(dbUser.id, dto);
            return Response.json({ success: true, exercise }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    }, Permission.EXERCISES_CREATE);

    /**
     * @openapi
     * /api/exercises/{id}:
     *   put:
     *     tags:
     *       - Exercises
     *     summary: Update an existing exercise
     *     description: >
     *       Modifies the details of an existing exercise. Users can only update exercises they have created.
     *       Requires the 'exercises:update' permission.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Unique ID of the exercise.
     *         schema: { type: string, format: uuid }
     *     requestBody:
     *       description: Fields to update.
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Exercise'
     *     responses:
     *       200:
     *         description: Exercise successfully updated.
     *       403:
     *         description: Forbidden - Lacks mandatory permissions or not the owner.
     *       404:
     *         description: Not Found - Exercise ID does not exist.
     *       500:
     *         description: Internal Server Error - Update failed.
     */
    router.put('/api/exercises/<id>', async (request, env) => {
        const { id } = request.params;
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        const dto = await request.json() as UpdateExerciseDto;

        try {
            const exercise = await exerciseService.update(id, dbUser.id, dto);
            if (!exercise) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: true, exercise }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    }, Permission.EXERCISES_UPDATE);

    /**
     * @openapi
     * /api/exercises/{id}:
     *   delete:
     *     tags:
     *       - Exercises
     *     summary: Delete an exercise
     *     description: >
     *       Permanently removes an exercise record. Users can only delete their own exercises.
     *       Requires the 'exercises:delete' permission.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Unique ID of the exercise.
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200:
     *         description: Successful deletion.
     *       403:
     *         description: Forbidden - Unauthorized or not the owner.
     *       404:
     *         description: Not Found - Exercise identifier invalid.
     */
    router.delete('/api/exercises/<id>', async (request, env) => {
        const { id } = request.params;
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        try {
            const success = await exerciseService.delete(id, dbUser.id);
            if (!success) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: true }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    }, Permission.EXERCISES_DELETE);
};
