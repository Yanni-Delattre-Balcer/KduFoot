
/**
 * Global Error Handler
 * Ensures consistent API responses and proper status codes.
 * SECURITY: Never reveals internal error details to the client.
 */
export class ErrorHandler {
    /** Safe, generic error messages keyed by HTTP status code */
    private static readonly SAFE_MESSAGES: Record<number, string> = {
        400: "Requête invalide.",
        401: "Non autorisé.",
        403: "Accès refusé.",
        404: "Ressource introuvable.",
        409: "Conflit – cette action ne peut pas être effectuée.",
        422: "Données invalides.",
        429: "Trop de requêtes. Veuillez réessayer plus tard.",
        500: "Une erreur interne s'est produite. Veuillez réessayer plus tard.",
    };

    static handle(e: unknown, corsHeaders: Record<string, string>) {
        let status = 500;
        let internalMessage = 'Unknown error';

        if (e instanceof Error) {
            internalMessage = e.message;
            if ('status' in e && typeof (e as Record<string, unknown>).status === 'number') {
                status = (e as Record<string, unknown>).status as number;
            }
        } else if (typeof e === 'object' && e !== null && 'status' in e && typeof (e as Record<string, unknown>).status === 'number') {
           status = (e as Record<string, unknown>).status as number;
        }

        // Log the REAL error for debugging — never sent to client
        console.error(`[API Error] ${status} - ${internalMessage}`);

        // SECURITY: Always return a generic, safe message to the client
        const userFriendlyMessage = ErrorHandler.SAFE_MESSAGES[status]
            ?? ErrorHandler.SAFE_MESSAGES[500];

        return Response.json(
            { 
                success: false, 
                error: userFriendlyMessage,
                code: status
            }, 
            { 
                status, 
                headers: { 
                    ...corsHeaders, 
                    "Content-Type": "application/json",
                } 
            }
        );
    }

    static unauthorized(corsHeaders: Record<string, string>) {
        return Response.json(
            { success: false, error: 'Non autorisé' }, 
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    static forbidden(corsHeaders: Record<string, string>) {
        return Response.json(
            { success: false, error: 'Accès refusé' }, 
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
}
