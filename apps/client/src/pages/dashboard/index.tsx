import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useMatches } from '@/hooks/use-matches';
import { matchService } from '@/services/matches';
import { useAuth0 } from '@auth0/auth0-react';
import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Spinner } from "@heroui/spinner";
import { Tabs, Tab } from "@heroui/tabs";
import { Link } from 'react-router-dom';
import FootballClock from '../../components/football-clock';
import { addToast } from '@heroui/toast';

const formatDate = (dateStr: string) => {
    try {
        const [year, month, day] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch {
        return dateStr;
    }
};

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr.replace(':', 'h');
};

export default function DashboardPage() {
    const { t } = useTranslation();
    const { getAccessTokenSilently } = useAuth0();
    // We use the direct import of addToast from @heroui/toast

    // 1. Mes Annonces (Organisateur)
    const { matches: myAnnouncements, isLoading: isLoadingAnnouncements } = useMatches({ ownerId: 'me', include_past: true });

    // 2. Demandes Reçues (Organisateur - pour agir sur les autres)
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [isLoadingIncoming, setIsLoadingIncoming] = useState(false);

    // 3. Mes Participations (Candidat - pour suivre mes propres demandes)
    const [myParticipations, setMyParticipations] = useState<any[]>([]);
    const [isLoadingParticipations, setIsLoadingParticipations] = useState(false);

    // Sub-filters states
    const [requestsSubFilter, setRequestsSubFilter] = useState<'all' | 'match' | 'tournament'>('all');
    const [organizedSubFilter, setOrganizedSubFilter] = useState<'all' | 'match' | 'tournament'>('all');
    const [participationsSubFilter, setParticipationsSubFilter] = useState<'all' | 'match' | 'tournament'>('all');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingIncoming(true);
            setIsLoadingParticipations(true);
            try {
                const token = await getAccessTokenSilently();

                // Fetch incoming
                const incRes = await matchService.getRequests(token);
                if (incRes.success) setIncomingRequests(incRes.requests);

                // Fetch participations
                const partRes = await matchService.getParticipations(token);
                if (partRes.success) setMyParticipations(partRes.participations);

            } catch (e) {
                console.error("Dashboard data fetch failed", e);
            } finally {
                setIsLoadingIncoming(false);
                setIsLoadingParticipations(false);
            }
        };
        fetchData();
    }, [getAccessTokenSilently]);

    const [isSaving, setIsSaving] = useState(false);

    // Sécurité H-2 : Verrouillage uniquement dans les 2h AVANT le match
    const isTooLate = (matchDate: string, matchTime: string) => {
        try {
            const matchDateTime = new Date(`${matchDate}T${matchTime}`);
            if (isNaN(matchDateTime.getTime())) return false;
            const now = new Date();
            const diffMs = matchDateTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            // On ne bloque QUE si on est dans la fenêtre des 2h avant le début
            return diffHours > 0 && diffHours < 2;
        } catch (e) {
            return false;
        }
    };

    const isMatchPast = (matchDate: string, matchTime: string) => {
        try {
            const matchDateTime = new Date(`${matchDate}T${matchTime}`);
            if (isNaN(matchDateTime.getTime())) return false;
            return matchDateTime.getTime() < new Date().getTime();
        } catch {
            return false;
        }
    };

    const handleUpdateStatus = async (matchId: string, userId: string, status: 'accepted' | 'refused') => {
        if (!confirm(t('matchForm.confirm.' + status, `Voulez-vous ${status === 'accepted' ? 'accepter' : 'refuser'} cette équipe ?`))) return;
        try {
            const token = await getAccessTokenSilently();
            await matchService.updateRequestStatus(matchId, userId, status, token);
            // Refresh
            const res = await matchService.getRequests(token);
            if (res.success) setIncomingRequests(res.requests);
        } catch (e: any) {
            const rawMessage = e.message || "";
            // Si le message est un JSON stringifié, on essaie de l'extraire
            let cleanMessage = rawMessage;
            try {
                if (rawMessage.startsWith('{')) {
                    const parsed = JSON.parse(rawMessage);
                    cleanMessage = parsed.error || parsed.message || rawMessage;
                }
            } catch { /* ignore */ }

            const errorMessage = cleanMessage === 'TOO_LATE_TO_MODIFY'
                ? t('error.too_late_to_modify')
                : (cleanMessage || t('error.save_failed'));

            addToast({
                title: t('error.title'),
                description: errorMessage,
                color: "danger"
            });
        }
    };

    const handleDeleteMatch = async (id: string, matchDate: string, matchTime: string) => {
        if (isTooLate(matchDate, matchTime)) {
            addToast({
                title: t('error.title'),
                description: t('error.too_late_to_modify'),
                color: "danger"
            });
            return;
        }
        if (!confirm('Voulez-vous vraiment supprimer cette annonce ?')) return;
        setIsSaving(true);
        try {
            const token = await getAccessTokenSilently();
            const res = await matchService.delete(id, token);
            if (res.success) {
                addToast({
                    title: t('success', 'Succès'),
                    description: "Annonce supprimée avec succès",
                    color: "success"
                });
                window.location.reload();
            }
        } catch (err: any) {
            const rawMessage = err.message || "";
            let cleanMessage = rawMessage;
            try {
                if (rawMessage.startsWith('{')) {
                    const parsed = JSON.parse(rawMessage);
                    cleanMessage = parsed.error || parsed.message || rawMessage;
                }
            } catch { /* ignore */ }

            const errorMessage = cleanMessage === 'TOO_LATE_TO_MODIFY'
                ? t('error.too_late_to_modify')
                : t('error.delete_failed');

            addToast({
                title: t('error.title'),
                description: errorMessage,
                color: "danger"
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Filtered lists
    const filteredRequests = incomingRequests.filter(r => {
        // Auto-masquage des demandes pour matchs passés
        if (isMatchPast(r.match_date, r.match_time)) return false;

        if (requestsSubFilter === 'all') return true;
        return r.type === requestsSubFilter;
    });

    const filteredOrganized = (myAnnouncements || []).filter(m => {
        if (organizedSubFilter === 'all') return true;
        return m.type === organizedSubFilter;
    });

    const filteredParticipations = myParticipations.filter(p => {
        // Auto-masquage des matchs terminés
        if (isMatchPast(p.match_date, p.match_time)) return false;

        if (participationsSubFilter === 'all') return true;
        return p.type === participationsSubFilter;
    });

    const renderSubFilters = (current: 'all' | 'match' | 'tournament', onChange: (v: 'all' | 'match' | 'tournament') => void) => (
        <div className="flex gap-2 p-1 rounded-xl bg-default-100/50 w-fit">
            <Button
                size="sm"
                variant={current === 'all' ? 'solid' : 'light'}
                color={current === 'all' ? 'danger' : 'default'}
                className={current === 'all' ? 'font-bold bg-danger text-white' : 'font-medium text-default-500'}
                onPress={() => onChange('all')}
            >
                {t('dashboard.tabs.all')}
            </Button>
            <Button
                size="sm"
                variant={current === 'match' ? 'solid' : 'light'}
                color={current === 'match' ? 'secondary' : 'default'}
                className={current === 'match' ? 'font-bold bg-violet-800 text-white' : 'font-medium text-default-500'}
                onPress={() => onChange('match')}
            >
                {t('dashboard.tabs.matches')}
            </Button>
            <Button
                size="sm"
                variant={current === 'tournament' ? 'solid' : 'light'}
                color={current === 'tournament' ? 'default' : 'default'}
                className={current === 'tournament' ? 'font-bold bg-purple-300 text-purple-950 shadow-sm' : 'font-medium text-default-500'}
                onPress={() => onChange('tournament')}
            >
                {t('dashboard.tabs.tournaments')}
            </Button>
        </div>
    );

    return (
        <DefaultLayout maxWidth="max-w-full">
            <section className="flex flex-col gap-8 w-full px-4 pt-2 pb-8">

                {/* Header Section - Rectangle Style matching Navbar */}
                <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-orange-600/15 via-amber-500/10 to-yellow-500/10 border border-orange-500/20 mb-2">
                    {/* Subtle grid pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(249,115,22,0.3) 40px, rgba(249,115,22,0.3) 80px)' }}></div>

                    {/* Field center line + circle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-b from-transparent via-white/5 to-transparent"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5"></div>

                    {/* Football clock - top right */}
                    <div className="hidden md:block absolute top-4 right-4 z-10">
                        <FootballClock size={140} />
                    </div>

                    <div className="relative flex flex-col items-center gap-6 py-14 px-6 text-center">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-orange-500/10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-orange-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-orange-500 to-amber-500">
                                {t('dashboard.title')}
                            </h1>
                        </div>
                        <p className="text-default-500 text-lg max-w-lg">
                            {t('dashboard.subtitle')}
                        </p>

                        <Button
                            as={Link}
                            to="/matches/new"
                            size="lg"
                            className="font-bold bg-linear-to-r from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/30 rounded-2xl h-14 px-8 w-full sm:w-auto relative z-20 mt-2"
                            startContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" /></svg>}
                        >
                            {t('dashboard.controls.new')}
                        </Button>
                    </div>
                </div>

                <Tabs
                    aria-label="Dashboard Options"
                    color="warning"
                    variant="underlined"
                    classNames={{
                        tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                        cursor: "w-full bg-orange-500",
                        tab: "max-w-fit px-0 h-12",
                        tabContent: "group-data-[selected=true]:text-orange-500 font-bold uppercase tracking-widest text-xs"
                    }}
                >
                    <Tab
                        key="requests"
                        title={
                            <div className="flex items-center space-x-2">
                                <span>{t('dashboard.tabs.requests')}</span>
                                {incomingRequests.filter(r => r.request_status === 'pending').length > 0 && (
                                    <Chip size="sm" variant="solid" color="danger" className="h-5 min-w-5 px-1">
                                        {incomingRequests.filter(r => r.request_status === 'pending').length}
                                    </Chip>
                                )}
                            </div>
                        }
                    >
                        <div className="flex flex-col gap-6 pt-6">
                            {renderSubFilters(requestsSubFilter, setRequestsSubFilter)}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoadingIncoming ? (
                                    <div className="col-span-full flex justify-center py-12"><Spinner color="warning" /></div>
                                ) : filteredRequests.length > 0 ? (
                                    filteredRequests.map((request, idx) => (
                                        <Card key={idx} className={`bg-default-50/5 border ${request.request_status === 'accepted' ? 'border-success/30' : 'border-default-100/10'} hover:bg-default-50/10 transition-colors`}>
                                            <CardBody className="p-5 flex flex-col gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1">
                                                        {request.requester_club_logo ? (
                                                            <Image src={request.requester_club_logo} className="object-contain" />
                                                        ) : (
                                                            <span className="text-white font-black text-xl">{request.requester_club_name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-white text-base leading-tight truncate">{request.requester_club_name}</h3>
                                                        <p className="text-[10px] text-default-500 font-bold uppercase tracking-widest mt-0.5">
                                                            {request.type === 'tournament' ? '🏆 Tournoi' : '⚽ Match'} • {t(`enums.category.${request.category}`)}
                                                        </p>
                                                    </div>
                                                    <Chip size="sm" color={request.request_status === 'accepted' ? 'success' : request.request_status === 'refused' ? 'danger' : 'warning'} variant="flat" className="font-black uppercase text-[9px]">
                                                        {t('dashboard.status.' + request.request_status)}
                                                    </Chip>
                                                </div>
                                                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                                                    <div className="flex justify-between items-center text-[10px] font-bold text-default-400">
                                                        <span>POUR LE MATCH DU</span>
                                                        <span className="text-white">{formatDate(request.match_date)} à {formatTime(request.match_time)}</span>
                                                    </div>
                                                    <p className="text-xs text-default-200 italic line-clamp-2">"{request.message || 'Aucun message'}"</p>
                                                </div>

                                                {request.request_status === 'pending' ? (
                                                    <div className="flex gap-2">
                                                        <Button size="sm" color="success" className="flex-1 font-black uppercase text-[10px] h-9 text-success-950" onPress={() => handleUpdateStatus(request.match_id, request.user_id, 'accepted')}>{t('dashboard.controls.accept')}</Button>
                                                        <Button size="sm" variant="flat" color="danger" className="flex-1 font-black uppercase text-[10px] h-9" onPress={() => handleUpdateStatus(request.match_id, request.user_id, 'refused')}>{t('dashboard.controls.refuse')}</Button>
                                                    </div>
                                                ) : (
                                                    <Button size="sm" variant="flat" className="w-full text-[10px] font-bold h-9" as={Link} to={`/matches/${request.match_id}`}>{t('dashboard.controls.view')}</Button>
                                                )}
                                            </CardBody>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center space-y-4">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-orange-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                                        </div>
                                        <p className="text-default-400 font-medium whitespace-pre-wrap">
                                            {requestsSubFilter === 'all' ? "Vous n'avez aucune demande en attente pour le moment." : requestsSubFilter === 'match' ? t('dashboard.empty.no_match') : t('dashboard.empty.no_tournament')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tab>

                    <Tab key="organized" title={t('dashboard.tabs.organized')}>
                        <div className="flex flex-col gap-6 pt-6">
                            {renderSubFilters(organizedSubFilter, setOrganizedSubFilter)}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoadingAnnouncements ? (
                                    <div className="col-span-full flex justify-center py-12"><Spinner color="warning" /></div>
                                ) : filteredOrganized.length > 0 ? (
                                    filteredOrganized.map((match) => (
                                        <Card key={match.id} as={Link} to={`/matches/${match.id}`} className="bg-default-50/5 hover:bg-default-50/10 border border-default-100/10 transition-all group">
                                            <CardBody className="p-5 flex flex-col gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6 ${match.type === 'tournament' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-500'}`}>
                                                        {match.type === 'tournament' ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" /></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Z" /></svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{formatDate(match.match_date)}</span>
                                                            <Chip size="sm" variant="flat" color={match.status === 'active' ? 'success' : 'default'} className="h-4 text-[9px] uppercase font-black">{match.status}</Chip>
                                                        </div>
                                                        <h3 className="font-bold text-white truncate text-base mt-0.5">
                                                            {match.type === 'tournament' ? match.name : `vs ${match.club?.name || '??'}`}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                    {!isTooLate(match.match_date, match.match_time) ? (
                                                        <>
                                                            <Button
                                                                as={Link}
                                                                to={`/matches/${match.id}/edit`}
                                                                size="sm"
                                                                variant="flat"
                                                                className="flex-1 font-bold text-[10px] h-8 bg-amber-500/10 text-amber-500"
                                                            >
                                                                Modifier
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="flat"
                                                                color="danger"
                                                                className="h-8 font-bold text-[10px]"
                                                                onPress={() => {
                                                                    handleDeleteMatch(match.id, match.match_date, match.match_time);
                                                                }}
                                                                isLoading={isSaving}
                                                            >
                                                                Supprimer
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <div className="flex-1 py-1 text-center border border-dashed border-danger/30 rounded-lg bg-danger/5">
                                                            <p className="text-[10px] font-bold text-danger leading-tight uppercase italic px-2">
                                                                Modifications verrouillées (H-2)
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardBody>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center space-y-6">
                                        <p className="text-default-400 font-medium">
                                            {organizedSubFilter === 'all' ? "Vous n'avez publié aucune annonce" : organizedSubFilter === 'match' ? t('dashboard.empty.no_match') : t('dashboard.empty.no_tournament')}
                                        </p>
                                        {organizedSubFilter === 'all' ? (
                                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                                <Button as={Link} to="/matches" color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400 w-full sm:w-auto">Rechercher un match</Button>
                                                <Button as={Link} to="/matches?type=tournament" color="default" variant="flat" className="font-bold bg-purple-300/20 text-purple-400 w-full sm:w-auto">Rechercher un tournoi</Button>
                                            </div>
                                        ) : (
                                            <Button as={Link} to={organizedSubFilter === 'tournament' ? "/matches?type=tournament" : "/matches"} color={organizedSubFilter === 'tournament' ? 'default' : 'secondary'} variant="flat" className={`font-bold w-full sm:w-auto ${organizedSubFilter === 'tournament' ? 'bg-purple-300/20 text-purple-400' : 'bg-violet-500/10 text-violet-400'}`}>
                                                {organizedSubFilter === 'tournament' ? "Rechercher un tournoi" : "Rechercher un match"}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tab>

                    <Tab
                        key="participations"
                        title={
                            <div className="flex items-center space-x-2">
                                <span>{t('dashboard.tabs.participations')}</span>
                                {myParticipations.filter(p => p.notification_state === 1).length > 0 && (
                                    <Chip size="sm" variant="solid" color="danger" className="h-5 min-w-5 px-1">
                                        {myParticipations.filter(p => p.notification_state === 1).length}
                                    </Chip>
                                )}
                            </div>
                        }
                    >
                        <div className="flex flex-col gap-6 pt-6">
                            {renderSubFilters(participationsSubFilter, setParticipationsSubFilter)}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoadingParticipations ? (
                                    <div className="col-span-full flex justify-center py-12"><Spinner color="warning" /></div>
                                ) : filteredParticipations.length > 0 ? (
                                    filteredParticipations.map((part, idx) => (
                                        <Card key={idx} className={`bg-default-50/5 border ${part.request_status === 'accepted' ? 'border-success/30' : 'border-default-100/10'} hover:bg-default-50/10 transition-colors`}>
                                            <CardBody className="p-5 flex flex-col gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1">
                                                        {part.host_club_logo ? (
                                                            <Image src={part.host_club_logo} className="object-contain" />
                                                        ) : (
                                                            <span className="text-white font-black text-xl">{part.host_club_name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-white text-base leading-tight truncate">{part.host_club_name}</h3>
                                                        <p className="text-[10px] text-default-500 font-bold uppercase tracking-widest mt-0.5">
                                                            {part.type === 'tournament' ? '🏆 Tournoi' : '⚽ Match'} • {t(`enums.category.${part.category}`)}
                                                        </p>
                                                    </div>
                                                    <Chip size="sm" color={part.request_status === 'accepted' ? 'success' : part.request_status === 'refused' ? 'danger' : 'warning'} variant="flat" className="font-black uppercase text-[9px]">
                                                        {t('dashboard.status.' + part.request_status)}
                                                    </Chip>
                                                </div>

                                                <div className="bg-white/5 rounded-xl p-4 space-y-3">
                                                    <div className="flex justify-between items-center text-[10px] font-black text-default-400 border-b border-white/5 pb-2">
                                                        <span className="uppercase">Rappel Événement</span>
                                                        <span className="text-white">{formatDate(part.match_date)} @ {formatTime(part.match_time)}</span>
                                                    </div>

                                                    {part.request_status === 'accepted' ? (
                                                        <div className="space-y-2 animate-appearance-in">
                                                            <div className="flex items-center gap-2 text-xs text-success-500 font-bold">
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.91 4.1a.75.75 0 0 1 .11 1.05l-9 12.5a.75.75 0 0 1-1.15.08l-5.25-5.25a.75.75 0 1 1 1.06-1.06l4.63 4.63 8.56-11.83a.75.75 0 0 1 1.05-.12Z" clipRule="evenodd" /></svg>
                                                                Demande Acceptée !
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <a href={`tel:${part.host_phone}`} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-success-500/10 hover:bg-success-500/20 text-success-500 text-xs font-black transition-colors truncate">
                                                                    📞 {part.host_phone || 'Non renseigné'}
                                                                </a>
                                                                <a href={`mailto:${part.host_email}`} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 text-xs font-black transition-colors truncate">
                                                                    ✉️ {part.host_email || 'Non renseigné'}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 py-1 text-center border border-dashed border-danger/30 rounded-lg bg-danger/5">
                                                            <p className="text-[10px] font-bold text-danger leading-tight uppercase italic px-2">
                                                                Les coordonnées seront visibles après acceptation.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <Button size="sm" variant="light" className="w-full text-[10px] font-bold h-7" as={Link} to={`/matches/${part.match_id}`}>{t('dashboard.controls.view')}</Button>
                                            </CardBody>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center space-y-4">
                                        <p className="text-default-400 font-medium">
                                            {participationsSubFilter === 'all' ? "Vous n'avez postulé à aucun match ni tournoi" : participationsSubFilter === 'match' ? t('dashboard.empty.no_match') : t('dashboard.empty.no_tournament')}
                                        </p>
                                        {participationsSubFilter === 'all' ? (
                                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                                <Button as={Link} to="/matches" color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400 w-full sm:w-auto">Rechercher un match</Button>
                                                <Button as={Link} to="/matches?type=tournament" color="default" variant="flat" className="font-bold bg-purple-300/20 text-purple-400 w-full sm:w-auto">Rechercher un tournoi</Button>
                                            </div>
                                        ) : (
                                            <Button as={Link} to={participationsSubFilter === 'tournament' ? "/matches?type=tournament" : "/matches"} color={participationsSubFilter === 'tournament' ? 'default' : 'secondary'} variant="flat" className={`font-bold w-full sm:w-auto ${participationsSubFilter === 'tournament' ? 'bg-purple-300/20 text-purple-400' : 'bg-violet-500/10 text-violet-400'}`}>
                                                {participationsSubFilter === 'tournament' ? "Rechercher un tournoi" : "Rechercher un match"}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tab>
                </Tabs>
            </section>
        </DefaultLayout>
    );
}
