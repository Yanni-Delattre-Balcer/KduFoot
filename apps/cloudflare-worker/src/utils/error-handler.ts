

/**
 * Technical Perfection: Global Error Handler
 * Ensures consistent API responses and proper status codes.
 * Shields internal server details from the client in production.
 */
export class ErrorHandler {
    static handle(e: unknown, corsHeaders: Record<string, string>) {
        let status = 500;
        let message = 'Internal Server Error';

        if (e instanceof Error) {
            message = e.message;
            if ('status' in e && typeof (e as any).status === 'number') {
                status = (e as any).status;
            }
        } else if (typeof e === 'object' && e !== null && 'status' in e && typeof (e as any).status === 'number') {
           status = (e as any).status;
        }

        console.error(`[API Error] ${status} - ${message}`);

        // Security: Don't reveal internal DB/System errors in production
        const userFriendlyMessage = (status === 500 || message.includes('D1_ERROR') || message.includes('SQLITE'))
            ? "Une erreur interne s'est produite. Veuillez réessayer plus tard." 
            : message;

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
                    "X-Error-Code": status.toString()
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
