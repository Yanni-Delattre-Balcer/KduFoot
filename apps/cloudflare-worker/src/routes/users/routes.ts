import { Router } from '../router';
import { Env } from '../../types/env';
import { setupProfileRoutes } from './profile';
import { setupSyncRoutes } from './sync';
import { setupPermissionsRoutes } from './permissions';

export const setupUserRoutes = (router: Router, env: Env) => {
    setupProfileRoutes(router, env);
    setupSyncRoutes(router, env);
    setupPermissionsRoutes(router, env);
};
