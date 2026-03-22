import { Router } from '../router';
import { Env } from '../../types/env';
import { ExecutionContext } from "@cloudflare/workers-types";
import { setupAdminUserRoutes } from './users';
import { setupAdminMatchRoutes } from './matches';
import { setupAdminStatsRoutes } from './stats';

export const setupAdminRoutes = (router: Router, env: Env, ctx: ExecutionContext) => {
    setupAdminUserRoutes(router, env, ctx);
    setupAdminMatchRoutes(router, env, ctx);
    setupAdminStatsRoutes(router, env, ctx);
};
