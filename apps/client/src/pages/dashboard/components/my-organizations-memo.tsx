import { Card, CardBody } from '@heroui/card';
import { Chip } from "@heroui/chip";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface MyOrganizationsMemoProps {
    events: any[];
    isLoading?: boolean;
    formatDate: (date: string) => string;
}

export const MyOrganizationsMemo = ({ events, isLoading, formatDate }: MyOrganizationsMemoProps) => {
    const { t } = useTranslation();

    const getStatusLabel = (event: any) => {
        const eventDate = new Date(`${event.match_date}T${event.match_time || '00:00'}:00`);
        const now = new Date();

        if (eventDate < now) {
            return { label: t('dashboard.status.completed', 'Terminé'), color: 'default' as const };
        }

        if (event.accepted_count >= (event.max_teams || 2)) {
            return { label: t('dashboard.status.full', 'Complet'), color: 'warning' as const };
        }

        return { label: t('dashboard.status.open', 'Ouvert'), color: 'success' as const };
    };

    if (isLoading) {
        return (
            <Card className="bg-default-50/5 border border-default-100/10">
                <CardBody className="p-4 flex justify-center items-center">
                    <div className="animate-pulse text-default-400 font-bold text-xs uppercase tracking-widest">{t('dashboard.memo.loading', 'Chargement du mémo...')}</div>
                </CardBody>
            </Card>
        );
    }

    // Limit to recent/active organizations
    const displayEvents = events.slice(0, 10);

    return (
        <Card className="bg-default-50/5 border border-default-100/10 shadow-sm overflow-hidden mb-8">
            <CardBody className="p-0">
                <div className="bg-white/[0.03] p-3 border-b border-white/5 flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-default-400 uppercase tracking-widest flex items-center gap-2">
                        <span>{t('dashboard.memo.title', '📋 Historique de mes créations')}</span>
                        <Chip size="sm" variant="flat" className="h-4 text-[8px] bg-white/5">{events.length}</Chip>
                    </h4>
                </div>
                <div className="flex flex-col">
                    {displayEvents.length > 0 ? (
                        displayEvents.map((event) => {
                            const status = getStatusLabel(event);
                            return (
                                <Link
                                    key={event.id}
                                    to={`/matches/${event.id}`}
                                    className="flex items-center gap-4 p-3 hover:bg-white/[0.05] transition-colors border-b border-white/5 last:border-0 group"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${event.type === 'tournament' ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-500'}`}>
                                        {event.type === 'tournament' ? '🏆' : '⚽'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-default-500">{formatDate(event.match_date)}</span>
                                            <span className="text-white font-bold text-xs truncate group-hover:text-amber-400 transition-colors">
                                                {event.type === 'tournament' ? event.name : `Match vs ${event.club?.name || '??'}`}
                                            </span>
                                        </div>
                                    </div>
                                    <Chip
                                        size="sm"
                                        variant="flat"
                                        color={status.color}
                                        className="h-5 text-[9px] font-black uppercase"
                                    >
                                        {status.label}
                                    </Chip>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-default-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </div>
                                </Link>
                            );
                        })
                    ) : (
                        <div className="p-6 text-center text-default-400 text-xs italic">
                            {t('dashboard.memo.empty', 'Aucun événement créé pour le moment.')}
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};
