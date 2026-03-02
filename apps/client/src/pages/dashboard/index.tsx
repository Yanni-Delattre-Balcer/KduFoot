import { useState, useEffect, useRef } from 'react';
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
import { Progress } from "@heroui/progress";
import { Tabs, Tab } from "@heroui/tabs";
import { Link } from 'react-router-dom';
import FootballClock from '../../components/football-clock';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { useUser } from '@/hooks/use-user';
import { useIncomingRequests, useMyParticipations } from '@/hooks/use-matches';
import DataWall from '@/components/data-wall';
import { addToast } from '@heroui/toast';
import { ConfirmedTournamentCard } from './components/confirmed-tournament-card';
import { OrganizedTournamentCard } from './components/organized-tournament-card';
import { MyOrganizationsMemo } from './components/my-organizations-memo';
import { ConfirmedMatchCard } from './components/confirmed-match-card';
import { useWelcomeGateway } from '@/contexts/welcome-gateway-context';

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

const formatTimestamp = (ts: number) => {
    try {
        const date = new Date(ts * 1000);
        return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch {
        return 'Date inconnue';
    }
};

const formatTimestampTime = (ts: number) => {
    try {
        const date = new Date(ts * 1000);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

export default function DashboardPage() {
    const { t } = useTranslation();
    const { getAccessTokenSilently } = useAuth0();

    // 1. Mes Annonces (Organisateur)
    const { matches: myAnnouncements, isLoading: isLoadingAnnouncements, mutate: mutateAnnouncements } = useMatches({ ownerId: 'me', include_past: true }, 5000);

    // 2. Demandes Reçues (Organisateur)
    const { requests: incomingRequests, isLoading: isLoadingIncoming, mutate: mutateIncoming, isIdle } = useIncomingRequests(5000);

    // 3. Mes Participations (Candidat)
    const { participations: myParticipations, isLoading: isLoadingParticipations, mutate: mutateParticipations, markAsRead: markAsReadHook } = useMyParticipations(5000);

    // States
    const [requestsSubFilter, setRequestsSubFilter] = useState<'all' | 'match' | 'tournament'>('all');
    const [organizedSubFilter, setOrganizedSubFilter] = useState<'all' | 'match' | 'tournament'>('all');
    const [highlightedCardId, setHighlightedCardIdState] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedClubProfile, setSelectedClubProfile] = useState<any>(null);

    // Modal state for 'Voir le profil'
    const { isOpen: isProfileOpen, onOpen: onProfileOpen, onOpenChange: onProfileChange } = useDisclosure();
    const { isLocked } = useUser();
    const { isVisitor } = useWelcomeGateway();

    const [selectedTab, setSelectedTab] = useState<any>("requests");

    useEffect(() => {
        if (isLocked) {
            setSelectedTab("requests"); // Default tab when unlocked later
        }
    }, [isLocked]);

    // Track seen notifications to trigger toasts only once
    const seenNotificationsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        (myParticipations || []).forEach(p => {
            if (p.notification_state === 1 && !seenNotificationsRef.current.has(p.match_id)) {
                addToast({
                    title: t('dashboard.alerts.title'),
                    description: t('dashboard.alerts.message', { host_club_name: p.host_club_name }),
                    color: "warning"
                });
                seenNotificationsRef.current.add(p.match_id);
            } else if (p.notification_state === 0 && seenNotificationsRef.current.has(p.match_id)) {
                seenNotificationsRef.current.delete(p.match_id);
            }
        });
    }, [myParticipations, t]);

    const setHighlightedCardId = (id: string) => {
        const element = document.getElementById(`card-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedCardIdState(id);
            setTimeout(() => setHighlightedCardIdState(null), 3000);
        }
    };

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
            // Refresh all relevant hooks
            mutateIncoming();
            mutateAnnouncements();
            mutateParticipations();
        } catch (e: any) {
            const rawMessage = e.message || "";
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

    const markAsRead = async (matchId: string) => {
        try {
            await markAsReadHook(matchId);
        } catch (e) {
            console.error("Failed to mark as read", e);
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
                mutateAnnouncements();
                mutateIncoming();
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
    const filteredRequests = (incomingRequests || []).filter(r => {
        // Auto-masquage des demandes pour matchs passés
        if (isMatchPast(r.match_date, r.match_time)) return false;
        // Only show PENDING requests in "Demandes Reçues"
        if (r.request_status !== 'pending') return false;

        if (requestsSubFilter === 'all') return true;
        return r.match_type === requestsSubFilter;
    });

    // Get IDs of matches that have at least one accepted request (they go to Matchs Confirmés)
    const confirmedMatchIds = new Set(
        (incomingRequests || []).filter(r => r.request_status === 'accepted').map(r => r.match_id)
    );

    const filteredOrganized = (myAnnouncements || []).filter(m => {
        // Hide matches that are confirmed (moved to Matchs Confirmés tab)
        if (confirmedMatchIds.has(m.id)) return false;
        if (organizedSubFilter === 'all') return true;
        return m.type === organizedSubFilter;
    });

    // Combine accepted participations + accepted incoming requests into "Matchs Confirmés"
    const acceptedIncomingAsOrganizer = (incomingRequests || [])
        .filter(r => r.request_status === 'accepted' && !isMatchPast(r.match_date, r.match_time))
        .map(r => ({
            ...r,
            _source: 'organizer' as const,
            // Normalize: organizer sees requester info
            opponent_club_name: r.requester_club_name,
            opponent_club_logo: r.requester_club_logo,
            opponent_city: r.requester_city,
            opponent_category: r.requester_category,
            opponent_level: r.requester_level,
            category: r.category,
            level: r.level,
            opponent_firstname: r.requester_firstname,
            opponent_lastname: r.requester_lastname,
            opponent_phone: r.requester_phone,
            opponent_email: r.requester_email,
            opponent_club_colors: r.requester_club_colors,
            opponent_pitch_type: r.requester_pitch_type,
            // If organizer created match as 'home', organizer plays at home
            isUserHome: r.match_type === 'tournament' || r.venue === 'Domicile',
            max_teams: r.match_max_teams,
            accepted_count: r.accepted_count,
        }));

    const acceptedParticipations = (myParticipations || [])
        .filter(p => !isMatchPast(p.match_date, p.match_time) && p.request_status === 'accepted')
        .map(p => ({
            ...p,
            _source: 'participant' as const,
            // Normalize: participant sees host/organizer info
            opponent_club_name: p.host_club_name,
            opponent_club_logo: p.host_club_logo,
            opponent_city: p.host_city || p.location_city,
            opponent_category: p.host_category || p.match_category,
            opponent_level: p.host_level || p.match_level,
            category: p.match_category || p.category,
            level: p.match_level || p.level,
            opponent_firstname: p.host_firstname,
            opponent_lastname: p.host_lastname,
            opponent_phone: p.host_phone,
            opponent_email: p.host_email,
            opponent_club_colors: p.host_club_colors,
            opponent_pitch_type: null,
            // If organizer created match as 'away', organizer plays away, so participant plays at home.
            // For tournaments, participant is always Away.
            isUserHome: p.match_type === 'tournament' ? false : p.venue === 'Extérieur',
            max_teams: p.match_max_teams,
            accepted_count: p.accepted_count,
        }));

    const allConfirmedMatches = [...acceptedIncomingAsOrganizer, ...acceptedParticipations].filter(m => m.match_type === 'match');
    const allConfirmedTournaments = [...acceptedIncomingAsOrganizer, ...acceptedParticipations].filter(m => m.match_type === 'tournament');

    // Notification summary for the "Flash" panel
    const modifiedParticipations = (myParticipations || []).filter(p => p.notification_state === 1);

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
                            {isIdle && (
                                <Chip
                                    size="sm"
                                    variant="flat"
                                    className="bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse ml-2"
                                    startContent={<span className="text-[10px]">🌙</span>}
                                >
                                    Mode Économie (Inactif)
                                </Chip>
                            )}
                        </div>
                        <p className="text-default-500 text-lg max-w-lg">
                            {t('dashboard.subtitle')}
                        </p>

                        {isLocked && (
                            <div className="mt-6 flex flex-col items-center gap-3 animate-appearance-in w-full max-w-2xl">
                                <Card className="bg-orange-500/10 border-2 border-orange-500/50 p-6 w-full shadow-2xl">
                                    <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                        <div className="text-5xl animate-bounce">🛡️</div>
                                        <div className="flex-1">
                                            <p className="text-orange-500 font-black text-xl uppercase mb-1 tracking-tighter">Configuration Obligatoire</p>
                                            <p className="text-default-400 text-sm font-medium leading-relaxed">
                                                Votre profil n'est pas encore complet. Pour garantir la sécurité de la plateforme, l'accès au Dashboard est suspendu tant que vos informations ne sont pas 100% validées.
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative min-h-[400px]">
                    {(isLocked || isVisitor) && (
                        <DataWall
                            message="Les informations de votre compte ne sont pas remplies. Vous n'avez pas accès à ces informations tant que votre fiche MON COMPTE n'est pas 100% complétée."
                        />
                    )}
                    <div className={(isLocked || isVisitor) ? "opacity-50 blur-[4px] pointer-events-none select-none" : ""}>
                        {/* Flash Notifications Panel */}
                        {modifiedParticipations.length > 0 && (
                            <div className="mb-6 animate-appearance-in">
                                <Card className="bg-danger/10 border-2 border-danger/30 shadow-xl shadow-danger/10">
                                    <CardBody className="p-4 flex flex-col sm:flex-row items-center gap-4">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="p-3 rounded-2xl bg-danger/20 text-danger animate-pulse">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" /></svg>
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className="font-black text-danger uppercase tracking-tight text-sm">Action Requise : Modifications Détectées</h4>
                                                <p className="text-default-400 text-xs">
                                                    {modifiedParticipations.length} match{modifiedParticipations.length > 1 ? 's ont' : ' a'} été modifié par l'organisateur. Veuillez vérifier les détails.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            color="danger"
                                            size="sm"
                                            className="font-bold uppercase text-[10px] px-6"
                                            onPress={() => {
                                                setHighlightedCardId(modifiedParticipations[0].match_id);
                                            }}
                                        >
                                            {t('dashboard.alerts.view_changes')}
                                        </Button>
                                    </CardBody>
                                </Card>
                            </div>
                        )}

                        <Tabs
                            aria-label="Dashboard Options"
                            color="secondary"
                            variant="underlined"
                            className="w-full"
                            selectedKey={selectedTab}
                            onSelectionChange={(key) => {
                                setSelectedTab(key);
                            }}
                            classNames={{
                                tabList: "bg-default-100/50 p-1.5 rounded-2xl w-full flex-wrap border-b-0 gap-2",
                                cursor: "rounded-xl shadow-lg shadow-purple-500/20",
                                tab: "h-auto py-2.5 sm:h-12 uppercase font-black tracking-tight text-[10px] sm:text-xs flex-1 min-w-[max-content] sm:min-w-0 px-3 sm:px-4",
                                tabContent: "group-data-[selected=true]:text-white whitespace-normal text-center leading-tight"
                            }}
                        >
                            <Tab
                                key="requests"
                                title={
                                    <div className="flex items-center space-x-2">
                                        <span>{t('dashboard.tabs.requests')}</span>
                                        {incomingRequests.filter(r => r.request_status === 'pending').length > 0 && (
                                            <Chip size="sm" variant="solid" color="danger" className="h-5 min-w-5 px-1 font-black">
                                                {incomingRequests.filter(r => r.request_status === 'pending').length}
                                            </Chip>
                                        )}
                                    </div>
                                }
                            >
                                <div className="flex flex-col gap-4 pt-2">
                                    {renderSubFilters(requestsSubFilter, setRequestsSubFilter)}

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {isLoadingIncoming ? (
                                            <div className="col-span-full flex justify-center py-12"><Spinner color="warning" /></div>
                                        ) : filteredRequests.length > 0 ? (
                                            filteredRequests.map((request, idx) => (
                                                <Card key={idx} className={`overflow-hidden border ${request.request_status === 'accepted' ? 'border-success/30 bg-success/5' : request.request_status === 'refused' ? 'border-danger/20 bg-danger/5' : 'border-orange-500/20 bg-linear-to-br from-orange-500/5 to-transparent'} md:hover:scale-[1.01] transition-all duration-200 shadow-sm hover:shadow-md`}>
                                                    <CardBody className="p-0">
                                                        {/* Top accent bar */}
                                                        <div className={`h-1 w-full ${request.request_status === 'accepted' ? 'bg-success' : request.request_status === 'refused' ? 'bg-danger' : 'bg-linear-to-r from-orange-500 via-amber-400 to-orange-500'}`} />

                                                        <div className="p-5 flex flex-col gap-4">
                                                            {/* Header: Club info + Status */}
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center overflow-hidden border border-orange-500/20 shrink-0">
                                                                    {request.requester_club_logo ? (
                                                                        <Image src={request.requester_club_logo} className="object-contain w-10 h-10" />
                                                                    ) : (
                                                                        <span className="text-orange-400 font-black text-2xl">{request.requester_club_name?.charAt(0)}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="font-black text-white text-sm leading-tight truncate uppercase tracking-tight">{request.requester_club_name}</h3>
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <Chip size="sm" variant="flat" color={request.match_type === 'tournament' ? 'secondary' : 'warning'} className="font-bold text-[9px] h-5 px-1.5 uppercase">
                                                                            {request.match_type === 'tournament' ? '🏆 TOURNOI' : '⚽ MATCH'}
                                                                        </Chip>
                                                                        <Chip size="sm" variant="flat" color={(request.match_type === 'tournament' || request.venue === 'Domicile') ? 'primary' : 'warning'} className="font-bold text-[9px] h-5 px-1.5 uppercase grayscale-[0.5]">
                                                                            {(request.match_type === 'tournament' || request.venue === 'Domicile') ? '🏠 Dom' : '✈️ Ext'}
                                                                        </Chip>
                                                                        <Chip size="sm" variant="dot" color="default" className="font-bold text-[9px] h-5 border-none">
                                                                            {request.requester_category ? t(`enums.category.${request.requester_category}`) : (request.match_category ? t(`enums.category.${request.match_category}`) : '—')}
                                                                        </Chip>
                                                                    </div>
                                                                </div>
                                                                <Chip size="sm" color={request.request_status === 'accepted' ? 'success' : request.request_status === 'refused' ? 'danger' : 'warning'} variant="solid" className="font-black uppercase text-[9px] shadow-sm">
                                                                    {t('dashboard.status.' + request.request_status)}
                                                                </Chip>
                                                            </div>
                                                            {/* Quick Info: Responsable, Ville, Catégorie, Niveau */}
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                                                <div className="flex items-center gap-1 text-[9px] text-default-400">
                                                                    <span className="text-default-600">👤</span>
                                                                    <span className="truncate">{request.requester_firstname && request.requester_lastname ? `${request.requester_firstname} ${request.requester_lastname}` : 'Non renseigné'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[9px] text-default-400">
                                                                    <span className="text-default-600">📍</span>
                                                                    <span className="truncate">{request.requester_city || request.location_city || 'Ville inconnue'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[9px] text-default-400">
                                                                    <span className="text-default-600">🏅</span>
                                                                    <span>{request.requester_category ? t(`enums.category.${request.requester_category}`) : '—'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[9px] text-default-400">
                                                                    <span className="text-default-600">🛡️</span>
                                                                    <span>{request.requester_level ? t(`enums.level.${request.requester_level}`) : '—'}</span>
                                                                </div>
                                                            </div>

                                                            {/* Match info banner */}
                                                            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-bold text-default-400 uppercase tracking-widest">{t('dashboard.labels.for_event', { type: request.match_type === 'tournament' ? t('enums.type.tournament').toLowerCase() : t('enums.type.match').toLowerCase() })}</span>
                                                                        <span className="text-sm font-black text-white mt-0.5">{formatDate(request.match_date)} à {formatTime(request.match_time)}</span>
                                                                    </div>
                                                                    {request.location_city && (
                                                                        <Chip size="sm" variant="flat" className="bg-white/5 text-default-400 text-[9px] font-bold">
                                                                            📍 {request.location_city}
                                                                        </Chip>
                                                                    )}
                                                                </div>
                                                                {request.message && request.message !== 'Demande de participation envoyée via KduFoot' && (
                                                                    <p className="text-[11px] text-default-300 italic mt-2 line-clamp-2 border-t border-white/5 pt-2">"{request.message}"</p>
                                                                )}
                                                            </div>

                                                            {/* Action Buttons */}
                                                            {request.request_status === 'pending' ? (
                                                                <div className="flex flex-col gap-2 relative z-20">
                                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            color="success"
                                                                            className="w-full sm:flex-1 font-black uppercase text-[11px] h-12 shadow-md shadow-success/20 active:scale-95"
                                                                            onPress={() => { handleUpdateStatus(request.match_id, request.user_id, 'accepted'); }}
                                                                        >
                                                                            ✓ {t('dashboard.controls.accept')}
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="flat"
                                                                            color="danger"
                                                                            className="w-full sm:flex-1 font-black uppercase text-[11px] h-12 active:scale-95"
                                                                            onPress={() => { handleUpdateStatus(request.match_id, request.user_id, 'refused'); }}
                                                                        >
                                                                            ✕ {t('dashboard.controls.refuse')}
                                                                        </Button>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="bordered"
                                                                        color="secondary"
                                                                        className="w-full font-bold text-[11px] h-11 border-secondary/30 text-secondary active:scale-95"
                                                                        onPress={() => { setSelectedClubProfile(request); onProfileOpen(); }}
                                                                    >
                                                                        {t('dashboard.labels.view_club_profile', '👤 Voir le profil du club')}
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col sm:flex-row gap-2 w-full relative z-20">
                                                                    <Button size="sm" variant="flat" className="w-full sm:flex-1 text-[11px] font-bold h-11 active:scale-95" as={Link} to={`/matches/${request.match_id}`} onClick={(e) => e.stopPropagation()}>{t('dashboard.controls.view')}</Button>
                                                                    <Button size="sm" variant="bordered" color="secondary" className="w-full sm:flex-1 text-[11px] font-bold h-11 border-secondary/30 active:scale-95" onPress={() => { setSelectedClubProfile(request); onProfileOpen(); }}>👤 Voir le profil</Button>
                                                                </div>
                                                            )}
                                                        </div>
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
                                <div className="flex flex-col gap-4 pt-2">
                                    {renderSubFilters(organizedSubFilter, setOrganizedSubFilter)}
                                    <MyOrganizationsMemo
                                        events={myAnnouncements}
                                        isLoading={isLoadingAnnouncements}
                                        formatDate={formatDate}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {isLoadingAnnouncements ? (
                                            <div className="col-span-full flex justify-center py-12"><Spinner color="warning" /></div>
                                        ) : filteredOrganized.length > 0 ? (
                                            filteredOrganized.map((match) => (
                                                match.type === 'tournament' ? (
                                                    <OrganizedTournamentCard
                                                        key={match.id}
                                                        match={match}
                                                        isTooLate={isTooLate(match.match_date, match.match_time)}
                                                        isSaving={isSaving}
                                                        onDelete={handleDeleteMatch}
                                                        formatDate={formatDate}
                                                        formatTime={formatTime}
                                                    />
                                                ) : (
                                                    <Card key={match.id} className="overflow-hidden border transition-all duration-300 shadow-xl hover:shadow-violet-500/20 col-span-full border-violet-500/40 bg-zinc-900/90 group">
                                                        <div className="absolute inset-0 bg-linear-to-br from-violet-600/10 via-transparent to-transparent opacity-50"></div>
                                                        <CardBody className="p-0">
                                                            <div className="flex flex-col md:flex-row">
                                                                <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/5">
                                                                    <div className="flex items-start justify-between gap-4 mb-4">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                                                                                {match.club?.logo_url ? (
                                                                                    <Image src={match.club.logo_url} className="object-contain" />
                                                                                ) : (
                                                                                    <span className="text-white font-black text-2xl">{match.club?.name?.charAt(0)}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <h3 className="font-black text-violet-400 text-3xl leading-tight truncate uppercase tracking-tighter group-hover:text-violet-300 transition-colors">MATCH</h3>
                                                                                <p className="text-white/70 text-sm font-bold uppercase tracking-widest">{match.club?.name || '??'}</p>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <Chip size="sm" variant="flat" color="secondary" className="font-black text-[10px] uppercase tracking-wider">
                                                                                        ⚽ {t('enums.type.match')}
                                                                                    </Chip>
                                                                                    <Chip size="sm" variant="flat" color={match.venue === 'Extérieur' ? 'warning' : 'primary'} className="h-5 text-[9px] uppercase font-black">
                                                                                        {match.venue === 'Extérieur' ? t('dashboard.labels.away_badge', '✈️ Extérieur') : t('dashboard.labels.home_badge', '🏠 Domicile')}
                                                                                    </Chip>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <Chip size="sm" color={match.status === 'active' ? 'secondary' : 'default'} variant="solid" className="font-black uppercase text-[10px] py-3 shadow-lg shadow-violet-500/30">
                                                                            {match.status === 'active' ? '🔍 RECHERCHE D\'ADVERSAIRE' : t(`dashboard.status.${match.status}`, match.status)}
                                                                        </Chip>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                                            <p className="text-[10px] font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.date', 'Date')}</p>
                                                                            <p className="text-sm font-bold text-white">{formatDate(match.match_date)}</p>
                                                                        </div>
                                                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                                            <p className="text-[10px] font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.time', 'Heure')}</p>
                                                                            <p className="text-sm font-bold text-white">{formatTime(match.match_time)}</p>
                                                                        </div>
                                                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                                            <p className="text-[10px] font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.format', 'Format')}</p>
                                                                            <Chip size="sm" variant="dot" color="primary" className="font-black text-xs border-none p-0">{match.format || '11v11'}</Chip>
                                                                        </div>
                                                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                                            <p className="text-[10px] font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.pitch_type', 'Terrain')}</p>
                                                                            <p className="text-sm font-bold text-white truncate">{match.pitch_type || '—'}</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        <div className="flex justify-between items-end">
                                                                            <p className="text-[11px] font-black text-violet-400 uppercase tracking-widest">
                                                                                {(match.accepted_count || 0) >= 1 ? t('dashboard.match.filled', 'Match complet') : t('dashboard.match.searching', 'Recherche d\'adversaire')}
                                                                            </p>
                                                                            <p className="text-xs font-bold text-white">{match.accepted_count || 0} / 1</p>
                                                                        </div>
                                                                        <Progress
                                                                            size="md"
                                                                            value={(match.accepted_count || 0) >= 1 ? 100 : 0}
                                                                            color="secondary"
                                                                            className="max-w-md"
                                                                            classNames={{
                                                                                indicator: "bg-linear-to-r from-violet-500 to-indigo-500"
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="w-full md:w-80 p-6 flex flex-col justify-end bg-white/[0.02]">
                                                                    <div className="space-y-3">
                                                                        {isTooLate(match.match_date, match.match_time) ? (
                                                                            <div className="py-3 px-4 text-center border border-dashed border-danger/30 rounded-xl bg-danger/5">
                                                                                <p className="text-[10px] font-black text-danger leading-tight uppercase px-2">
                                                                                    {t('dashboard.alerts.h2_locked', 'Événement verrouillé (H-2). Contactez les participants pour tout changement de dernière minute.')}
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col gap-2">
                                                                                <div className="flex gap-2">
                                                                                    <Button
                                                                                        as={Link}
                                                                                        to={`/matches/${match.id}/edit`}
                                                                                        size="sm"
                                                                                        variant="flat"
                                                                                        className="flex-1 font-bold text-[11px] h-11 bg-amber-500/10 text-amber-500 active:scale-95"
                                                                                    >
                                                                                        {t('edit', 'Modifier')}
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="flat"
                                                                                        color="danger"
                                                                                        className="flex-1 h-11 font-bold text-[11px] active:scale-95"
                                                                                        onPress={() => handleDeleteMatch(match.id, match.match_date, match.match_time)}
                                                                                        isLoading={isSaving}
                                                                                    >
                                                                                        {t('delete', 'Supprimer')}
                                                                                    </Button>
                                                                                </div>
                                                                                <Button
                                                                                    as={Link}
                                                                                    to={`/matches/${match.id}`}
                                                                                    size="sm"
                                                                                    variant="solid"
                                                                                    color="secondary"
                                                                                    className="w-full font-bold text-[11px] h-10 active:scale-95 shadow-md shadow-secondary/20"
                                                                                >
                                                                                    {t('dashboard.controls.manage_registrations', 'Gérer les demandes')}
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                )
                                            ))
                                        ) : (
                                            <div className="col-span-full py-8 text-center space-y-6">
                                                <p className="text-default-400 font-medium">
                                                    {organizedSubFilter === 'all' ? "Vous n'avez publié aucune annonce" : organizedSubFilter === 'match' ? t('dashboard.empty.no_match') : t('dashboard.empty.no_tournament')}
                                                </p>
                                                {organizedSubFilter === 'all' ? (
                                                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                                        <Button as={Link} to="/matches" color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400 w-full sm:w-auto">{t('dashboard.labels.search_match', 'Rechercher un match')}</Button>
                                                        <Button as={Link} to="/matches?type=tournament" color="default" variant="flat" className="font-bold bg-purple-300/20 text-purple-400 w-full sm:w-auto">{t('dashboard.labels.search_tournament', 'Rechercher un tournoi')}</Button>
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
                                        {allConfirmedTournaments.length > 0 && (
                                            <Chip size="sm" variant="solid" color="secondary" className="h-5 min-w-5 px-1 font-black">
                                                {allConfirmedTournaments.length}
                                            </Chip>
                                        )}
                                    </div>
                                }
                            >
                                <div className="flex flex-col gap-4 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {isLoadingParticipations ? (
                                            <div className="col-span-full flex justify-center py-12"><Spinner color="secondary" /></div>
                                        ) : allConfirmedTournaments.length > 0 ? (
                                            allConfirmedTournaments.map((part) => (
                                                <ConfirmedTournamentCard
                                                    key={part.match_id}
                                                    participation={part}
                                                    highlighted={highlightedCardId === part.match_id}
                                                    onMarkAsRead={markAsRead}
                                                    formatDate={formatDate}
                                                    formatTime={formatTime}
                                                />
                                            ))
                                        ) : (
                                            <div className="col-span-full py-8 text-center space-y-4">
                                                <p className="text-default-400 font-medium">
                                                    {t('dashboard.labels.no_participation_tournament', "Vous n'avez postulé à aucun tournoi")}
                                                </p>
                                                <Button as={Link} to="/matches?type=tournament" color="default" variant="flat" className="font-bold bg-purple-300/20 text-purple-400 w-full sm:w-auto">{t('dashboard.labels.search_tournament', 'Rechercher un tournoi')}</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Tab>

                            <Tab
                                key="confirmed_matches"
                                title={
                                    <div className="flex items-center space-x-2">
                                        <span>{t('dashboard.tabs.confirmed_matches')}</span>
                                        {allConfirmedMatches.length > 0 && (
                                            <Chip size="sm" variant="solid" color="success" className="h-5 min-w-5 px-1">
                                                {allConfirmedMatches.length}
                                            </Chip>
                                        )}
                                    </div>
                                }
                            >
                                <div className="flex flex-col gap-4 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {(isLoadingIncoming || isLoadingParticipations) ? (
                                            <div className="col-span-full flex justify-center py-12"><Spinner color="success" /></div>
                                        ) : allConfirmedMatches.length > 0 ? (
                                            allConfirmedMatches.map((cm, idx) => (
                                                <ConfirmedMatchCard
                                                    key={idx}
                                                    match={cm}
                                                    highlighted={highlightedCardId === cm.match_id}
                                                    onMarkAsRead={markAsRead}
                                                    formatDate={formatDate}
                                                    formatTime={formatTime}
                                                />
                                            ))
                                        ) : (
                                            <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                                <div className="p-4 rounded-2xl bg-white/5 text-default-400 mb-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                                                    </svg>
                                                </div>
                                                <p className="text-default-400 font-bold">{t('dashboard.empty.participations')}</p>
                                                <Button
                                                    variant="light"
                                                    color="primary"
                                                    className="mt-4 font-bold"
                                                    as={Link}
                                                    to="/matches"
                                                >
                                                    {t('dashboard.labels.search_match')}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Tab>
                        </Tabs>
                    </div>
                </div>
            </section>
            <Modal isOpen={isProfileOpen} onOpenChange={onProfileChange} backdrop="blur">
                <ModalContent className="bg-[#1a1a1c] border border-white/10">
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🛡️</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-black uppercase tracking-tighter text-white">Profil du Club</h3>
                                    <p className="text-[10px] text-default-400 font-bold uppercase">Informations de contact vérifiées</p>
                                </div>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                {selectedClubProfile ? (
                                    <div className="flex flex-col gap-6 animate-appearance-in">
                                        {/* Header Profil */}
                                        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center overflow-hidden border border-orange-500/20">
                                                {selectedClubProfile.requester_club_logo || selectedClubProfile.host_club_logo ? (
                                                    <Image src={selectedClubProfile.requester_club_logo || selectedClubProfile.host_club_logo} className="object-contain w-14 h-14" alt="Club Logo" />
                                                ) : (
                                                    <span className="text-orange-400 font-black text-4xl">{(selectedClubProfile.requester_club_name || selectedClubProfile.host_club_name)?.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xl font-black text-white uppercase truncate">{selectedClubProfile.requester_club_name || selectedClubProfile.host_club_name}</h4>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <Chip size="sm" variant="flat" color="warning" className="font-bold text-[9px] uppercase">{t(`enums.category.${selectedClubProfile.requester_category || selectedClubProfile.category}`)}</Chip>
                                                    <Chip size="sm" variant="flat" color="primary" className="font-bold text-[9px] uppercase">{t(`enums.level.${selectedClubProfile.requester_level || selectedClubProfile.level}`)}</Chip>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Details */}
                                        <div className="grid gap-3">
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black uppercase text-default-400">Responsable</span>
                                                <span className="text-sm font-bold text-white uppercase">{selectedClubProfile.requester_firstname || selectedClubProfile.host_firstname} {selectedClubProfile.requester_lastname || selectedClubProfile.host_lastname}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black uppercase text-default-400">Téléphone</span>
                                                <a href={`tel:${selectedClubProfile.requester_phone || selectedClubProfile.host_phone}`} className="text-sm font-black text-orange-500 hover:animate-pulse">
                                                    {selectedClubProfile.requester_phone || selectedClubProfile.host_phone}
                                                </a>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black uppercase text-default-400">Email</span>
                                                <a href={`mailto:${selectedClubProfile.requester_email || selectedClubProfile.host_email}`} className="text-sm font-bold text-primary hover:underline truncate ml-4">
                                                    {selectedClubProfile.requester_email || selectedClubProfile.host_email}
                                                </a>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black uppercase text-default-400">Ville</span>
                                                <span className="text-sm font-bold text-white uppercase tracking-tight">{selectedClubProfile.requester_city || selectedClubProfile.host_city || selectedClubProfile.location_city}</span>
                                            </div>
                                        </div>

                                        {/* Metadata box */}
                                        <div className="mt-2 pt-4 border-t border-white/5 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-default-500 tracking-tighter uppercase font-bold text-[9px]">Date de la demande</span>
                                                <span className="text-white font-bold">
                                                    {selectedClubProfile.contacted_at ? `${formatTimestamp(selectedClubProfile.contacted_at)} à ${formatTimestampTime(selectedClubProfile.contacted_at)}` : 'Inconnue'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-default-500 tracking-tighter uppercase font-bold text-[9px]">Pour le match du</span>
                                                <span className="text-warning-500 font-black">{formatDate(selectedClubProfile.match_date)} à {formatTime(selectedClubProfile.match_time)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-center p-8"><Spinner color="warning" /></div>
                                )}
                            </ModalBody>
                            <ModalFooter className="border-t border-white/5 pt-4">
                                <Button color="secondary" variant="flat" onPress={onClose} className="font-black uppercase tracking-tighter w-full h-12">
                                    Fermer
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </DefaultLayout>
    );
}
