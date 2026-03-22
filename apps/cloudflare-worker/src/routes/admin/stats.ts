import { Router } from '../router';
import { Env } from '../../types/env';
import { ExecutionContext } from "@cloudflare/workers-types";

export const setupAdminStatsRoutes = (router: Router, env: Env, ctx: ExecutionContext) => {
    // Reserved for future admin statistics endpoints
};
