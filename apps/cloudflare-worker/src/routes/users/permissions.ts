import { Router } from '../router';
import { Env } from '../../types/env';
import { getManagementToken, addPermissionsToUser } from '../../auth0';

export const setupPermissionsRoutes = (router: Router, env: Env) => {
    /**
     * POST /api/__auth0/token
     */
    router.post(
        "/api/__auth0/token",
        async () => {
            try {
                const token = await getManagementToken(env);
                return new Response(
                    JSON.stringify({
                        access_token: token,
                        token_type: "Bearer",
                        expires_in: 3600,
                        from_cache: true,
                    }),
                    {
                        status: 200,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                    },
                );
            } catch (_error) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Internal server error' }),
                    {
                        status: 500,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                    },
                );
            }
        },
        env.ADMIN_AUTH0_PERMISSION,
    );

    /**
     * POST /api/__auth0/autopermissions
     */
    router.post(
        "/api/__auth0/autopermissions",
        async (_request, env, _ctx) => {
            try {
                const autoPermsStr = env.AUTH0_AUTOMATIC_PERMISSIONS || "";
                if (!autoPermsStr) {
                    return new Response(JSON.stringify({ success: true, message: "No automatic permissions configured" }), {
                        status: 200,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                    });
                }

                const autoPerms = autoPermsStr.split(",").map(p => p.trim()).filter(p => p !== "");
                const currentPerms = router.userPermissions || [];
                const missingPerms = autoPerms.filter(p => !currentPerms.includes(p));

                if (missingPerms.length === 0) {
                    return new Response(JSON.stringify({ success: true, message: "User already has all automatic permissions" }), {
                        status: 200,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                    });
                }

                const userId = router.jwtPayload.sub;
                if (!userId) {
                    throw new Error("User ID not found in token");
                }

                await addPermissionsToUser(userId, missingPerms, env);

                return new Response(JSON.stringify({ success: true, added: missingPerms }), {
                    status: 200,
                    headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                });
            } catch (_error) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Internal server error' }),
                    {
                        status: 500,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                    },
                );
            }
        },
        "",
    );
};
