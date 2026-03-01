import React, { useState, useEffect } from 'react';
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
import { Input } from "@heroui/input";
import { Link } from 'react-router-dom';
import FootballClock from '../../components/football-clock';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { useUser } from '@/hooks/use-user';
import { useIncomingRequests, useMyParticipations } from '@/hooks/use-matches';
import { useRef } from 'react';
import { useWelcomeGateway } from '@/contexts/welcome-gateway-context';
import { isProfileComplete } from '@/utils/profile';
import AccountSettings from '@/components/account-settings';

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
    const { user: dbUser } = useUser();

    // 1. Mes Annonces (Organisateur)
    const { matches: myAnnouncements, isLoading: isLoadingAnnouncements, mutate: mutateAnnouncements } = useMatches({ ownerId: 'me', include_past: true });

    // 2. Demandes Reçues (Organisateur)
    const { requests: incomingRequests, isLoading: isLoadingIncoming, mutate: mutateIncoming } = useIncomingRequests();

    // 3. Mes Participations (Candidat)
    const { participations: myParticipations, isLoading: isLoadingParticipations, mutate: mutateParticipations, markAsRead: markAsReadHook } = useMyParticipations();

    // States
    const [requestsSubFilter, setRequestsSubFilter] = useState<'all' | 'match' | 'tournament'>('all');
    const [organizedSubFilter, setOrganizedSubFilter] = useState<'all' | 'match' | 'tournament'>('all');
    const [highlightedCardId, setHighlightedCardIdState] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedClubProfile, setSelectedClubProfile] = useState<any>(null);

    // Modal state for 'Voir le profil'
    const { isOpen: isProfileOpen, onOpen: onProfileOpen, onOpenChange: onProfileChange } = useDisclosure();

    const { isVisitor, setVisitorMode } = useWelcomeGateway();
    const profileComplete = isProfileComplete(dbUser);
    const isLocked = !profileComplete && !isVisitor;

    const [selectedTab, setSelectedTab] = useState<any>("requests");

    useEffect(() => {
        if (isLocked) {
            setSelectedTab("account");
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
                        </div>
                        <p className="text-default-500 text-lg max-w-lg">
                            {t('dashboard.subtitle')}
                        </p>

                        {isLocked && (
                            <div className="mt-6 flex flex-col items-center gap-3 animate-appearance-in">
                                <Card className="bg-orange-500/10 border border-orange-500/30 p-4 max-w-xl">
                                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                                        <div className="text-3xl">🔒</div>
                                        <div className="flex-1">
                                            <p className="text-orange-500 font-bold text-sm uppercase mb-1">Profil Incomplet</p>
                                            <p className="text-default-400 text-xs">Veuillez compléter vos informations pour accéder à toutes les fonctionnalités.</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            color="warning"
                                            className="font-bold border border-orange-500/30"
                                            onPress={() => setVisitorMode()}
                                        >
                                            Visiter sans s'inscrire
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

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
                    color="warning"
                    variant="underlined"
                    className="w-full"
                    selectedKey={selectedTab}
                    onSelectionChange={(key) => {
                        if (isLocked && key !== "account") {
                            addToast({
                                title: "Action bloquée",
                                description: t('account.locking_message', "Veuillez compléter votre profil pour accéder à cet onglet."),
                                color: "warning"
                            });
                            return;
                        }
                        setSelectedTab(key);
                    }}
                    classNames={{
                        tabList: "bg-default-100/50 p-1.5 rounded-2xl w-full flex-wrap border-b-0 gap-2",
                        cursor: "rounded-xl shadow-lg shadow-orange-500/20",
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
                        <div className="flex flex-col gap-6 pt-6">
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
                                                                <span className="text-[9px] font-bold text-default-400 uppercase tracking-widest">Pour le {request.match_type === 'tournament' ? 'tournoi' : 'match'} du</span>
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
                                                                👤 Voir le profil du club
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
                        <div className="flex flex-col gap-6 pt-6">
                            {renderSubFilters(organizedSubFilter, setOrganizedSubFilter)}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoadingAnnouncements ? (
                                    <div className="col-span-full flex justify-center py-12"><Spinner color="warning" /></div>
                                ) : filteredOrganized.length > 0 ? (
                                    filteredOrganized.map((match) => (
                                        <Card key={match.id} as={Link} to={`/matches/${match.id}`} className="bg-default-50/5 hover:bg-default-50/10 border border-default-100/10 transition-all group md:hover:scale-[1.01] active:scale-[0.99]">
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
                                                            <Chip size="sm" variant="flat" color={(match.type === 'tournament' || match.venue === 'Domicile') ? 'primary' : 'warning'} className="h-4 text-[8px] uppercase font-black grayscale-[0.5]">
                                                                {(match.type === 'tournament' || match.venue === 'Domicile') ? '🏠 Dom' : '✈️ Ext'}
                                                            </Chip>
                                                            <Chip size="sm" variant="flat" color={match.status === 'active' ? 'success' : 'default'} className="h-4 text-[8px] uppercase font-black uppercase">{match.status}</Chip>
                                                        </div>
                                                        <h3 className="font-bold text-white truncate text-base mt-0.5">
                                                            {match.type === 'tournament' ? match.name : `vs ${match.club?.name || '??'}`}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                    {!isTooLate(match.match_date, match.match_time) ? (
                                                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                                                            <Button
                                                                as={Link}
                                                                to={`/matches/${match.id}/edit`}
                                                                size="sm"
                                                                variant="flat"
                                                                className="w-full sm:flex-1 font-bold text-[11px] h-11 bg-amber-500/10 text-amber-500 active:scale-95"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                Modifier
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="flat"
                                                                color="danger"
                                                                className="w-full sm:flex-1 h-11 font-bold text-[11px] active:scale-95"
                                                                onPress={() => {
                                                                    handleDeleteMatch(match.id, match.match_date, match.match_time);
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                isLoading={isSaving}
                                                            >
                                                                Supprimer
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 py-1 text-center border border-dashed border-danger/30 rounded-lg bg-danger/5">
                                                            <p className="text-[10px] font-bold text-danger leading-tight uppercase italic px-2">
                                                                Modifications verrouillées (H-2)
                                                            </p>
                                                        </div>
                                                    )}
                                                    {match.type === 'tournament' && (
                                                        <div className="mt-4 space-y-3 border-t border-white/5 pt-4" onClick={(e) => e.stopPropagation()}>
                                                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                                                <span>📋 {t('dashboard.tournament.pairings')}</span>
                                                                <span className="text-[8px] text-default-500 font-medium lowercase">({match.accepted_count || 0}/{match.max_teams || '∞'} équipes)</span>
                                                            </p>
                                                            {match.pairings && match.pairings.length > 0 ? (
                                                                <div className="grid gap-2">
                                                                    {match.pairings.map((pairing: any) => (
                                                                        <div key={pairing.id} className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col gap-2">
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                    <span className="text-[11px] font-bold text-white truncate">{pairing.team_a_club_name}</span>
                                                                                    <span className="text-[9px] text-default-500 font-black">VS</span>
                                                                                    <span className="text-[11px] font-bold text-white truncate">{pairing.team_b_club_name}</span>
                                                                                </div>
                                                                                <Input
                                                                                    type="time"
                                                                                    size="sm"
                                                                                    variant="flat"
                                                                                    defaultValue={pairing.scheduled_time}
                                                                                    className="w-24 shrink-0"
                                                                                    classNames={{ input: "text-[10px] font-black" }}
                                                                                    onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                                                        const newTime = e.target.value;
                                                                                        if (newTime === pairing.scheduled_time) return;
                                                                                        try {
                                                                                            const token = await getAccessTokenSilently();
                                                                                            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/matches/pairings/${pairing.id}`, {
                                                                                                method: 'PATCH',
                                                                                                headers: {
                                                                                                    'Content-Type': 'application/json',
                                                                                                    'Authorization': `Bearer ${token}`
                                                                                                },
                                                                                                body: JSON.stringify({ scheduled_time: newTime })
                                                                                            });
                                                                                            const data = await res.json();
                                                                                            if (!data.success) {
                                                                                                alert(data.error || "Erreur lors de la mise à jour");
                                                                                                e.target.value = pairing.scheduled_time;
                                                                                            } else {
                                                                                                mutateAnnouncements();
                                                                                            }
                                                                                        } catch (err) {
                                                                                            alert("Erreur réseau");
                                                                                            e.target.value = pairing.scheduled_time;
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-purple-500/5 rounded-xl p-4 border border-dashed border-purple-500/20 text-center">
                                                                    <p className="text-[10px] text-purple-300 font-medium">Les confrontations apparaîtront ici une fois les équipes acceptées.</p>
                                                                </div>
                                                            )}
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
                                {allConfirmedTournaments.length > 0 && (
                                    <Chip size="sm" variant="solid" color="secondary" className="h-5 min-w-5 px-1 font-black">
                                        {allConfirmedTournaments.length}
                                    </Chip>
                                )}
                            </div>
                        }
                    >
                        <div className="flex flex-col gap-6 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoadingParticipations ? (
                                    <div className="col-span-full flex justify-center py-12"><Spinner color="secondary" /></div>
                                ) : allConfirmedTournaments.length > 0 ? (
                                    allConfirmedTournaments.map((part) => (
                                        <Card
                                            key={part.match_id}
                                            id={`card-${part.match_id}`}
                                            className={`overflow-hidden border transition-all duration-300 shadow-sm hover:shadow-md ${highlightedCardId === part.match_id ? 'border-danger ring-4 ring-danger/20 animate-pulse' : 'border-purple-400/50'} md:hover:scale-[1.01]`}
                                        >
                                            <CardBody className="p-5 flex flex-col gap-4">
                                                {part.notification_state === 1 && (
                                                    <div className="bg-danger/20 border border-danger/30 rounded-xl p-3 mb-2 animate-pulse">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-danger text-xs font-black uppercase tracking-tighter">⚠️ Modification détectée</span>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                color="danger"
                                                                variant="solid"
                                                                className="h-7 min-w-unit-16 text-[10px] font-black uppercase px-3 shadow-lg shadow-danger/20"
                                                                onPress={() => {
                                                                    markAsRead(part.match_id);
                                                                }}
                                                            >
                                                                VÉRIFIER
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

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
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <p className="text-[10px] text-default-500 font-bold uppercase tracking-widest">
                                                                {part.type === 'tournament' ? '🏆 Tournoi' : '⚽ Match'} • {t(`enums.category.${part.category}`)}
                                                            </p>
                                                            <Chip size="sm" variant="flat" color={(part.type === 'tournament' || part.venue === 'Domicile') ? 'warning' : 'primary'} className="h-4 text-[8px] uppercase font-black grayscale-[0.5]">
                                                                {(part.type === 'tournament' || part.venue === 'Domicile') ? '✈️ Ext' : '🏠 Dom'}
                                                            </Chip>
                                                        </div>
                                                    </div>
                                                    <Chip size="sm" color={part.request_status === 'accepted' ? 'success' : part.request_status === 'refused' ? 'danger' : 'warning'} variant="flat" className="font-black uppercase text-[9px]">
                                                        {t('dashboard.status.' + part.request_status)}
                                                    </Chip>
                                                </div>

                                                {/* Modification Alert */}
                                                {part.notification_state === 1 && (
                                                    <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 flex flex-col gap-2 animate-pulse shadow-lg shadow-danger/5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-danger/20 p-1.5 rounded-lg">
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-danger"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" /></svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-black text-danger uppercase tracking-tight">Attention !</p>
                                                                <p className="text-[10px] text-danger/90 font-bold leading-tight">
                                                                    L'organisateur ({part.host_club_name}) a modifié les informations.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="danger"
                                                            className="h-7 text-[10px] font-black uppercase bg-danger/20 hover:bg-danger/30"
                                                            onPress={() => markAsRead(part.match_id)}
                                                        >
                                                            J'ai compris, marquer comme lu
                                                        </Button>
                                                    </div>
                                                )}

                                                <div className="bg-white/5 rounded-xl p-4 space-y-3">
                                                    <div className="flex justify-between items-center text-[10px] font-black text-default-400 border-b border-white/5 pb-2">
                                                        <span className="uppercase">{part.type === 'tournament' ? 'Informations Tournoi' : 'Rappel Événement'}</span>
                                                        <span className="text-white">{formatDate(part.match_date)} @ {formatTime(part.match_time)}</span>
                                                    </div>

                                                    {part.request_status === 'accepted' ? (
                                                        <div className="space-y-3 animate-appearance-in">
                                                            <div className="flex items-center gap-2 text-xs text-success-500 font-bold">
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.91 4.1a.75.75 0 0 1 .11 1.05l-9 12.5a.75.75 0 0 1-1.15.08l-5.25-5.25a.75.75 0 1 1 1.06-1.06l4.63 4.63 8.56-11.83a.75.75 0 0 1 1.05-.12Z" clipRule="evenodd" /></svg>
                                                                {part.type === 'tournament' ? 'Participation Confirmée !' : 'Demande Acceptée !'}
                                                            </div>

                                                            {part.type === 'tournament' && (
                                                                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex flex-col gap-2">
                                                                    <div className="flex items-center justify-between text-[10px] font-bold text-purple-200 uppercase tracking-tighter">
                                                                        <span>Confrontations prévues</span>
                                                                        <Chip size="sm" variant="flat" color="secondary" className="h-4 text-[8px]">Mise à jour en direct</Chip>
                                                                    </div>
                                                                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                                                        {/* Mock or real pairings list */}
                                                                        <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                                                                            <span className="text-[10px] font-bold text-white truncate max-w-[40%] text-left">{part.host_club_name}</span>
                                                                            <span className="text-[10px] font-black text-purple-400">VS</span>
                                                                            <span className="text-[10px] font-bold text-white truncate max-w-[40%] text-right">{part.opponent_club_name}</span>
                                                                        </div>
                                                                        <div className="text-[9px] text-center text-default-400 italic">
                                                                            D'autres matchs seront ajoutés par l'organisateur.
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        as="a"
                                                                        href={`tel:${part.host_phone}`}
                                                                        size="sm"
                                                                        color="success"
                                                                        className="flex-1 font-black text-[10px] uppercase h-8"
                                                                    >
                                                                        📞 Appeler
                                                                    </Button>
                                                                    <Button
                                                                        as="a"
                                                                        href={`mailto:${part.host_email}`}
                                                                        size="sm"
                                                                        color="primary"
                                                                        className="flex-1 font-black text-[10px] uppercase h-8"
                                                                    >
                                                                        ✉️ Email
                                                                    </Button>
                                                                </div>

                                                                {/* Logic Domicile/Extérieur for address */}
                                                                {(part.venue === 'Extérieur') && (
                                                                    <Button
                                                                        as="a"
                                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${part.location_address || ''} ${part.location_city || ''}`)}`}
                                                                        target="_blank"
                                                                        size="sm"
                                                                        variant="flat"
                                                                        className="w-full font-black text-[10px] uppercase h-8 bg-white/5"
                                                                    >
                                                                        🗺️ Itinéraire : {part.location_city}
                                                                    </Button>
                                                                )}
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
                                            Vous n'avez postulé à aucun tournoi
                                        </p>
                                        <Button as={Link} to="/matches?type=tournament" color="default" variant="flat" className="font-bold bg-purple-300/20 text-purple-400 w-full sm:w-auto">Rechercher un tournoi</Button>
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
                        <div className="flex flex-col gap-6 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(isLoadingIncoming || isLoadingParticipations) ? (
                                    <div className="col-span-full flex justify-center py-12"><Spinner color="success" /></div>
                                ) : allConfirmedMatches.length > 0 ? (
                                    allConfirmedMatches.map((cm, idx) => (
                                        <Card key={idx} className="overflow-hidden border border-success/20 bg-linear-to-br from-success/5 via-transparent to-emerald-500/5 hover:scale-[1.01] transition-all duration-200 shadow-lg shadow-success/5">
                                            <CardBody className="p-0">
                                                {/* Top bar */}
                                                <div className="h-1.5 w-full bg-linear-to-r from-green-500 via-emerald-400 to-green-500" />

                                                <div className="p-5 flex flex-col gap-4">
                                                    {/* MATCH CONFIRMÉ Badge + Domicile/Extérieur */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Chip size="sm" variant="solid" color="success" className="font-black text-[9px] uppercase shadow-sm">
                                                                ✅ MATCH CONFIRMÉ
                                                            </Chip>
                                                            <Chip size="sm" variant="flat" color={cm.isUserHome ? 'primary' : 'warning'} className="font-bold text-[9px] h-5 border-none">
                                                                {cm.isUserHome ? '🏠 À Domicile' : '✈️ À l\'Extérieur'}
                                                            </Chip>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-default-400">
                                                            {cm._source === 'organizer' ? 'Organisateur' : 'Participant'}
                                                        </span>
                                                    </div>

                                                    {/* VS Layout — Home first, Away second (like TV) */}
                                                    <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            {/* HOME Team (left) */}
                                                            <div className="flex-1 flex flex-col items-center text-center min-w-0">
                                                                <span className="text-[8px] font-bold text-default-500 uppercase tracking-widest mb-1">Domicile</span>
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border shrink-0 ${cm.isUserHome ? 'bg-linear-to-br from-orange-500/20 to-amber-500/10 border-orange-500/20' : 'bg-linear-to-br from-green-500/20 to-emerald-500/10 border-green-500/20'}`}>
                                                                    {cm.isUserHome ? (
                                                                        dbUser?.club?.logo_url ? (
                                                                            <Image src={dbUser.club.logo_url} className="object-contain w-8 h-8" />
                                                                        ) : (
                                                                            <span className="text-orange-400 font-black text-lg">{(dbUser?.club?.name || '?')?.charAt(0)}</span>
                                                                        )
                                                                    ) : (
                                                                        cm.opponent_club_logo ? (
                                                                            <Image src={cm.opponent_club_logo} className="object-contain w-8 h-8" />
                                                                        ) : (
                                                                            <span className="text-green-400 font-black text-lg">{cm.opponent_club_name?.charAt(0)}</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                                <p className="text-[9px] font-black text-white mt-1.5 w-full leading-tight line-clamp-2">
                                                                    {cm.isUserHome ? (dbUser?.club?.name || 'Mon Club') : cm.opponent_club_name}
                                                                </p>
                                                            </div>

                                                            {/* VS Badge */}
                                                            <div className="shrink-0 flex flex-col items-center">
                                                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                                                                    <span className="text-white font-black text-xs">VS</span>
                                                                </div>
                                                            </div>

                                                            {/* AWAY Team (right) */}
                                                            <div className="flex-1 flex flex-col items-center text-center min-w-0">
                                                                <span className="text-[8px] font-bold text-default-500 uppercase tracking-widest mb-1">Extérieur</span>
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border shrink-0 ${!cm.isUserHome ? 'bg-linear-to-br from-orange-500/20 to-amber-500/10 border-orange-500/20' : 'bg-linear-to-br from-green-500/20 to-emerald-500/10 border-green-500/20'}`}>
                                                                    {!cm.isUserHome ? ( // User is away => user is right side
                                                                        dbUser?.club?.logo_url ? (
                                                                            <Image src={dbUser.club.logo_url} className="object-contain w-8 h-8" />
                                                                        ) : (
                                                                            <span className="text-orange-400 font-black text-lg">{(dbUser?.club?.name || '?')?.charAt(0)}</span>
                                                                        )
                                                                    ) : ( // User is home => opponent is right side
                                                                        cm.opponent_club_logo ? (
                                                                            <Image src={cm.opponent_club_logo} className="object-contain w-8 h-8" />
                                                                        ) : (
                                                                            <span className="text-green-400 font-black text-lg">{cm.opponent_club_name?.charAt(0)}</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                                <p className="text-[9px] font-black text-white mt-1.5 w-full leading-tight line-clamp-2">
                                                                    {!cm.isUserHome ? (dbUser?.club?.name || 'Mon Club') : cm.opponent_club_name}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Category + Level chips */}
                                                        <div className="flex items-center justify-center gap-1.5 mt-3">
                                                            {cm.opponent_category && (
                                                                <Chip size="sm" variant="flat" color="success" className="font-bold text-[9px] h-5 px-1.5">
                                                                    {t(`enums.category.${cm.opponent_category}`)}
                                                                </Chip>
                                                            )}
                                                            {cm.opponent_level && (
                                                                <Chip size="sm" variant="dot" color="default" className="font-bold text-[9px] h-5 border-none">
                                                                    {t(`enums.level.${cm.opponent_level}`)}
                                                                </Chip>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Match Date & Location */}
                                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-bold text-default-400 uppercase tracking-widest">📅 Date du match</span>
                                                                <span className="text-sm font-black text-white mt-0.5">{formatDate(cm.match_date)} à {formatTime(cm.match_time)}</span>
                                                            </div>
                                                            {cm.location_city && (
                                                                <Chip size="sm" variant="flat" className="bg-white/5 text-default-400 text-[9px] font-bold">
                                                                    📍 {cm.location_city}
                                                                </Chip>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Contact Info — Unlocked */}
                                                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                                                                <span className="text-[10px]">🔓</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-success uppercase tracking-wider">Coordonnées débloquées</span>
                                                        </div>

                                                        {/* Responsable Name */}
                                                        {(cm.opponent_firstname || cm.opponent_lastname) && (
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-default-500 font-bold">👤 Responsable</span>
                                                                <span className="text-white font-bold">{cm.opponent_firstname} {cm.opponent_lastname}</span>
                                                            </div>
                                                        )}

                                                        {/* Phone */}
                                                        {cm.opponent_phone && (
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-default-500 font-bold">📞 N° du responsable</span>
                                                                <a href={`tel:${cm.opponent_phone}`} className="text-success font-black hover:underline">
                                                                    {cm.opponent_phone}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {/* Email */}
                                                        {cm.opponent_email && (
                                                            <div className="flex justify-between items-center text-xs gap-2">
                                                                <span className="text-default-500 font-bold shrink-0">✉️ Email</span>
                                                                <a href={`mailto:${cm.opponent_email}`} className="text-primary font-black hover:underline truncate">
                                                                    {cm.opponent_email}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {/* City */}
                                                        {cm.opponent_city && (
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-default-500 font-bold">📍 Ville</span>
                                                                <span className="text-white font-bold">{cm.opponent_city}</span>
                                                            </div>
                                                        )}

                                                        {/* Club Colors */}
                                                        {cm.opponent_club_colors && (
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-default-500 font-bold">👕 Couleurs maillots</span>
                                                                <span className="text-white font-bold">{cm.opponent_club_colors}</span>
                                                            </div>
                                                        )}

                                                        {/* Address — Google Maps link (Only for AWAY team) */}
                                                        {!cm.isUserHome && cm.location_address && (
                                                            <div className="flex justify-between items-center text-xs gap-2">
                                                                <span className="text-default-500 font-bold shrink-0">🏟️ Adresse</span>
                                                                <a
                                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cm.location_address + (cm.location_zip ? ' ' + cm.location_zip : '') + (cm.location_city ? ' ' + cm.location_city : ''))}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-warning font-black hover:underline truncate"
                                                                    title="Ouvrir l'itinéraire dans Google Maps"
                                                                >
                                                                    {cm.location_address}{cm.location_zip ? `, ${cm.location_zip}` : ''} 📍
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <Button size="sm" variant="flat" className="w-full text-[10px] font-bold h-9 bg-success/10 text-success" as={Link} to={`/matches/${cm.match_id}`}>
                                                        ⚽ Voir les détails du match
                                                    </Button>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center space-y-4">
                                        <div className="w-16 h-16 bg-success/5 rounded-full flex items-center justify-center mx-auto">
                                            <span className="text-3xl">⚽</span>
                                        </div>
                                        <p className="text-default-400 font-medium">
                                            Aucun match confirmé pour le moment
                                        </p>
                                        <p className="text-[11px] text-default-500">
                                            Les matchs apparaîtront ici lorsque des demandes seront acceptées.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tab>

                    <Tab
                        key="account"
                        title={
                            <div className="flex items-center space-x-2">
                                <span>{t('dashboard.tabs.account', 'MON COMPTE')}</span>
                                {!profileComplete && (
                                    <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                                )}
                            </div>
                        }
                    >
                        <div className="pt-6">
                            <AccountSettings />
                        </div>
                    </Tab>
                </Tabs>

                <Modal isOpen={isProfileOpen} onOpenChange={onProfileChange} backdrop="blur">
                    <ModalContent className="bg-[#1a1a1c] border border-white/10">
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1 text-white font-black uppercase tracking-tighter">Profil du Club</ModalHeader>
                                <ModalBody>
                                    {selectedClubProfile ? (
                                        <div className="flex flex-col items-center gap-4 py-4">
                                            <div className="w-24 h-24 bg-linear-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg text-white font-bold text-4xl">
                                                {selectedClubProfile.requester_club_logo ? (
                                                    <Image src={selectedClubProfile.requester_club_logo} className="w-full h-full object-contain rounded-full" />
                                                ) : (
                                                    selectedClubProfile.requester_club_name?.charAt(0)
                                                )}
                                            </div>

                                            <div className="text-center space-y-1">
                                                <h3 className="font-black text-xl text-white">{selectedClubProfile.requester_club_name || 'Club inconnu'}</h3>
                                            </div>

                                            <div className="bg-default-100/5 p-4 rounded-xl border border-default-100/10 w-full mt-2 space-y-3">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-default-500 font-bold uppercase tracking-wider">Responsable</span>
                                                    <span className="text-white font-bold">
                                                        {selectedClubProfile.requester_firstname} {selectedClubProfile.requester_lastname}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-default-500 font-bold uppercase tracking-wider">Ville</span>
                                                    <span className="text-white font-bold">{selectedClubProfile.requester_city || 'Non renseignée'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-default-500 font-bold uppercase tracking-wider">Catégorie</span>
                                                    <span className="text-white font-bold">
                                                        {selectedClubProfile.requester_category ? t(`enums.category.${selectedClubProfile.requester_category}`) : 'Non renseignée'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-default-500 font-bold uppercase tracking-wider">Niveau</span>
                                                    <span className="text-white font-bold">
                                                        {selectedClubProfile.requester_level ? t(`enums.level.${selectedClubProfile.requester_level}`) : 'Non renseigné'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Request Details */}
                                            <div className="bg-default-100/5 p-4 rounded-xl border border-default-100/10 w-full space-y-2">
                                                <p className="text-[10px] text-default-400 font-bold uppercase tracking-wider">Demande envoyée</p>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-default-500">Date</span>
                                                    <span className="text-white font-bold">
                                                        {selectedClubProfile.contacted_at ? `${formatTimestamp(selectedClubProfile.contacted_at)} à ${formatTimestampTime(selectedClubProfile.contacted_at)}` : 'Inconnue'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-default-500">Pour le {selectedClubProfile.match_type === 'tournament' ? 'tournoi' : 'match'} du</span>
                                                    <span className="text-warning-500 font-bold">{formatDate(selectedClubProfile.match_date)} à {formatTime(selectedClubProfile.match_time)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center p-8"><Spinner /></div>
                                    )}
                                </ModalBody>
                                <ModalFooter>
                                    <Button color="secondary" onPress={onClose} className="font-black uppercase tracking-tighter w-full">
                                        Fermer
                                    </Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>
            </section>
        </DefaultLayout>
    );
}
