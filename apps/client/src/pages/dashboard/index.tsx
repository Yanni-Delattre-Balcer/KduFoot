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

const formatTimestamp = (ts: number, t: any) => {
    try {
        const date = new Date(ts * 1000);
        return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch {
        return t('common.unknown_date', 'Date inconnue');
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
    const { t } = useTranslation('kdufoot');
    const { getAccessTokenSilently } = useAuth0();

    // 1. Mes Annonces (Organisateur)
    const { matches: myAnnouncements, isLoading: isLoadingAnnouncements, mutate: mutateAnnouncements, closeRegistrations } = useMatches({ ownerId: 'me', include_past: true });

    // 2. Demandes Reçues (Organisateur)
    const { requests: incomingRequests, isLoading: isLoadingIncoming, mutate: mutateIncoming } = useIncomingRequests();

    // 3. Mes Participations (Candidat)
    const { participations: myParticipations, isLoading: isLoadingParticipations, mutate: mutateParticipations, markAsRead: markAsReadHook } = useMyParticipations();

    // States
    const [requestsSubFilter, setRequestsSubFilter] = useState<'all' | 'match' | 'tournament'>('all');
    const [organizedSubFilter, setOrganizedSubFilter] = useState<'all' | 'match' | 'tournament'>('all');
    const [highlightedCardId, setHighlightedCardIdState] = useState<string | null>(null);
    const [showChanges, setShowChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedClubProfile, setSelectedClubProfile] = useState<any>(null);

    // Modal state for 'Voir le profil'
    const { isOpen: isProfileOpen, onOpen: onProfileOpen, onOpenChange: onProfileChange } = useDisclosure();
    const { isLocked, user } = useUser();

    const [selectedTab, setSelectedTab] = useState<any>("requests");

    // Track last seen data to detect specific changes (Surgical Highlight)
    const [knownData, setKnownData] = useState<Record<string, any>>(() => {
        try {
            const saved = localStorage.getItem('kdufoot_known_match_data');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const updateKnownData = (participations: any[]) => {
        const newKnown = { ...knownData };
        let changed = false;
        participations.forEach(p => {
            // Only update known data for confirmations that are currently marked "unread" (notification_state === 0)
            // or if we don't have data yet. We ONLY save if it is NOT currently modified, so we lock in the "original" state.
            if (!newKnown[p.match_id] && p.notification_state === 0) {
                newKnown[p.match_id] = {
                    date: p.match_date,
                    time: p.match_time,
                    venue: p.venue,
                    format: p.match_format || p.format,
                    pitch: p.match_pitch_type || p.pitch_type
                };
                changed = true;
            }
        });
        if (changed) {
            setKnownData(newKnown);
            localStorage.setItem('kdufoot_known_match_data', JSON.stringify(newKnown));
        }
    };

    useEffect(() => {
        if (myParticipations) {
            updateKnownData(myParticipations);
        }
    }, [myParticipations]);

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
        setHighlightedCardIdState(id);
        setShowChanges(true);
        // Wait a tick for React to render (e.g. tab switch) then scroll
        requestAnimationFrame(() => {
            setTimeout(() => {
                const element = document.getElementById(`card-${id}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 150);
        });
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
        const confirmMsg = t(`matchForm.confirm.${status}`, { defaultValue: status === 'accepted' ? 'Souhaitez-vous vraiment accepter cette équipe ?' : 'Souhaitez-vous vraiment refuser cette équipe ?' });
        if (!confirm(confirmMsg)) return;
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

    const markAllAsRead = async () => {
        setIsSaving(true);
        try {
            for (const p of modifiedParticipations) {
                await markAsReadHook(p.match_id);
            }
            // Reset badge counter
            localStorage.removeItem(`kdufoot_unread_count_${user?.id || 'guest'}`);
            window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
            addToast({
                title: t('success'),
                description: t('dashboard.toasts.all_read_success', "Toutes les modifications ont été validées"),
                color: "success"
            });
        } catch (e) {
            console.error("Failed to mark all as read", e);
        } finally {
            setIsSaving(false);
        }
    };

    const markAsRead = async (matchId: string) => {
        try {
            await markAsReadHook(matchId);
            // Update knownData so changes are no longer detected
            const p = (myParticipations || []).find(p => p.match_id === matchId);
            if (p) {
                setKnownData(prev => {
                    const next = {
                        ...prev,
                        [matchId]: {
                            date: p.match_date,
                            time: p.match_time,
                            venue: p.venue,
                            format: p.match_format || p.format,
                            pitch: p.match_pitch_type || p.pitch_type
                        }
                    };
                    localStorage.setItem('kdufoot_known_match_data', JSON.stringify(next));
                    return next;
                });
            }
            // Clear highlight if this was the highlighted card
            if (highlightedCardId === matchId) {
                setHighlightedCardIdState(null);
                setShowChanges(false);
            }
            // Decrement (or clear) badge counter
            const uk = `kdufoot_unread_count_${user?.id || 'guest'}`;
            const current = parseInt(localStorage.getItem(uk) || '0');
            if (current <= 1) {
                localStorage.removeItem(uk);
            } else {
                localStorage.setItem(uk, String(current - 1));
            }
            window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
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
        if (!confirm(t('dashboard.confirm_delete', 'Voulez-vous vraiment supprimer cette annonce ?'))) return;
        setIsSaving(true);
        try {
            const token = await getAccessTokenSilently();
            const res = await matchService.delete(id, token);
            if (res.success) {
                addToast({
                    title: t('success'),
                    description: t('dashboard.toasts.delete_success', "Annonce supprimée avec succès"),
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

    const handleCloseRegistrations = async (id: string) => {
        setIsSaving(true);
        try {
            await closeRegistrations(id);
            addToast({
                title: t('success'),
                description: "Les inscriptions sont désormais closes.",
                color: "success"
            });
        } catch (err: any) {
            addToast({
                title: t('error.title'),
                description: err.message || "Erreur lors de la fermeture des inscriptions",
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
            opponent_pitch_type: r.requester_pitch_type || r.host_pitch_type,
            opponent_club_colors: r.requester_club_colors,
            opponent_stadium_address: r.requester_stadium_address,
            opponent_club_address: r.requester_club_address,
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
            opponent_pitch_type: p.match_pitch_type || p.host_pitch_type,
            opponent_club_colors: p.host_club_colors,
            opponent_stadium_address: p.host_stadium_address,
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
    const modifiedMatchIds = new Set(modifiedParticipations.filter(p => p.match_type === 'match').map(p => p.match_id));
    const modifiedTournamentIds = new Set(modifiedParticipations.filter(p => p.match_type === 'tournament').map(p => p.match_id));
    const modifiedMatchCount = modifiedMatchIds.size;
    const modifiedTournamentCount = modifiedTournamentIds.size;

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
                        <div className="flex items-center justify-center w-full gap-3">
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

                        {/* Push notification activation button for iOS */}
                        {'Notification' in window && Notification.permission === 'default' && (
                            <Button
                                color="warning"
                                variant="flat"
                                size="sm"
                                className="font-bold text-xs uppercase tracking-wide mt-2 shadow-lg shadow-orange-500/10 border border-orange-500/20"
                                startContent={<span>🔔</span>}
                                onPress={async () => {
                                    const perm = await Notification.requestPermission();
                                    if (perm === 'granted') {
                                        window.dispatchEvent(new CustomEvent('kdufoot_push_granted'));
                                    }
                                }}
                                aria-label="Activer les notifications push"
                            >
                                Activer les notifications
                            </Button>
                        )}

                        {isLocked && (
                            <div className="mt-6 flex flex-col items-center gap-3 animate-appearance-in w-full max-w-2xl">
                                <Card className="bg-orange-500/10 border-2 border-orange-500/50 p-6 w-full shadow-2xl">
                                    <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                        <div className="text-5xl animate-bounce">🛡️</div>
                                        <div className="flex-1">
                                            <p className="text-orange-500 font-black text-xl uppercase mb-1 tracking-tighter">{t('dashboard.sections.locked_title')}</p>
                                            <p className="text-default-400 text-sm font-medium leading-relaxed">
                                                {t('dashboard.sections.locked_desc')}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

                <DataWall>
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
                                            <h4 className="font-black text-danger uppercase tracking-tight text-sm">{t('dashboard.sections.modifications_title')}</h4>
                                            <p className="text-default-400 text-xs">
                                                {t('dashboard.sections.modifications_desc', { count: modifiedParticipations.length, plural: modifiedParticipations.length > 1 ? 's ont' : ' a' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            color="danger"
                                            size="sm"
                                            className="font-bold uppercase text-xs sm:text-sm px-6"
                                            onPress={() => {
                                                const first = modifiedParticipations[0];
                                                // Switch to the correct tab
                                                if (first.match_type === 'tournament') {
                                                    setSelectedTab('participations');
                                                } else {
                                                    setSelectedTab('confirmed_matches');
                                                }
                                                setHighlightedCardId(first.match_id);
                                            }}
                                        >
                                            {t('dashboard.controls.view_changes', 'J\'AI VU LES MODIFICATIONS')}
                                        </Button>
                                        <Button
                                            color="success"
                                            variant="flat"
                                            size="sm"
                                            className="font-bold uppercase text-xs sm:text-sm px-6 bg-success/20 text-success"
                                            onPress={markAllAsRead}
                                            isLoading={isSaving}
                                        >
                                            {t('dashboard.controls.mark_all_read', "TOUT VALIDER")}
                                        </Button>
                                    </div>
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
                            tabList: "bg-default-100/50 p-1.5 rounded-2xl w-full flex-col sm:flex-row border-b-0 gap-2",
                            cursor: "rounded-xl shadow-lg shadow-purple-500/20",
                            tab: "h-auto py-3 sm:h-12 uppercase font-black tracking-tight text-[11px] sm:text-sm flex-1 min-w-full sm:min-w-0 px-3 sm:px-4",
                            tabContent: "group-data-[selected=true]:text-white whitespace-normal text-center leading-tight overflow-hidden"
                        }}
                    >
                        <Tab
                            key="requests"
                            title={
                                <div className="flex items-center space-x-2">
                                    <span>{t('dashboard.tabs.requests')}</span>
                                    {isLocked && <span className="text-default-400">🔒</span>}
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

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    {isLoadingIncoming ? (
                                        <div className="col-span-full flex justify-center py-12"><Spinner color="warning" aria-label={t('loading')} /></div>
                                    ) : filteredRequests.length > 0 ? (
                                        filteredRequests.map((request, idx) => (
                                            <Card key={idx} className={`overflow-hidden border ${request.request_status === 'accepted' ? 'border-success/30 bg-success/5' : request.request_status === 'refused' ? 'border-danger/20 bg-danger/5' : 'border-orange-500/20 bg-linear-to-br from-orange-500/5 to-transparent'} md:hover:scale-[1.01] transition-all duration-200 shadow-sm hover:shadow-md`}>
                                                <CardBody className="p-0">
                                                    {/* Top accent bar */}
                                                    <div className={`h-1 w-full ${request.request_status === 'accepted' ? 'bg-success' : request.request_status === 'refused' ? 'bg-danger' : 'bg-linear-to-r from-orange-500 via-amber-400 to-orange-500'}`} />

                                                    <div className="p-5 flex flex-col gap-4">
                                                        {/* Header: Club info + Status */}
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center overflow-hidden border border-orange-500/20 shrink-0">
                                                                    {request.requester_club_logo ? (
                                                                        <Image src={request.requester_club_logo} className="object-contain w-10 h-10" />
                                                                    ) : (
                                                                        <span className="text-orange-400 font-black text-2xl">{request.requester_club_name?.charAt(0)}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="font-black text-white text-sm leading-tight break-words uppercase tracking-tight">{request.requester_club_name}</h3>
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                                        <Chip size="sm" variant="flat" color={request.match_type === 'tournament' ? 'secondary' : 'warning'} className="font-bold text-[9px] h-auto py-0.5 px-1.5 uppercase shrink-0">
                                                                            {request.match_type === 'tournament' ? '🏆 ' + t('enums.type.tournament').toUpperCase() : '⚽ ' + t('enums.type.match').toUpperCase()}
                                                                        </Chip>
                                                                        <Chip size="sm" variant="flat" color={(request.match_type === 'tournament' || request.venue === 'Domicile') ? 'primary' : 'warning'} className="font-bold text-[9px] h-5 px-1.5 uppercase grayscale-[0.5]">
                                                                            {(request.match_type === 'tournament' || request.venue === 'Domicile') ? t('dashboard.labels.home_badge') : t('dashboard.labels.away_badge')}
                                                                        </Chip>
                                                                        <Chip size="sm" variant="dot" color="default" className="font-bold text-[9px] h-5 border-none">
                                                                            {request.requester_category ? t(`enums.category.${request.requester_category}`) : (request.match_category ? t(`enums.category.${request.match_category}`) : '—')}
                                                                        </Chip>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-start sm:justify-end w-full sm:w-auto sm:max-w-[120px] shrink-0">
                                                                <Chip size="sm" color={request.request_status === 'accepted' ? 'success' : request.request_status === 'refused' ? 'danger' : 'warning'} variant="solid" className="font-black uppercase text-[9px] shadow-sm whitespace-nowrap">
                                                                    {t('dashboard.status.' + request.request_status)}
                                                                </Chip>
                                                            </div>
                                                        </div>
                                                        {/* Quick Info: Responsable, Ville, Catégorie, Niveau */}
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                                            <div className="flex items-center gap-1 text-[9px] text-default-400">
                                                                <span className="text-default-600">👤</span>
                                                                <span className="truncate">{request.requester_firstname && request.requester_lastname ? `${request.requester_firstname} ${request.requester_lastname}` : t('common.not_provided', 'Non renseigné')}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[9px] text-default-400">
                                                                <span className="text-default-600">📍</span>
                                                                <span className="truncate">{request.requester_city || request.location_city || t('common.unknown_city', 'Ville inconnue')}</span>
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
                                                                <p className="text-sm text-default-300 italic mt-2 line-clamp-2 border-t border-white/5 pt-2">"{request.message}"</p>
                                                            )}
                                                        </div>

                                                        {/* Action Buttons */}
                                                        {request.request_status === 'pending' ? (
                                                            <div className="flex flex-col gap-2 relative z-20">
                                                                <div className="flex flex-col sm:flex-row gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        color="success"
                                                                        className="w-full sm:flex-1 font-black uppercase text-sm h-12 shadow-md shadow-success/20 active:scale-95"
                                                                        onPress={() => { handleUpdateStatus(request.match_id, request.user_id, 'accepted'); }}
                                                                    >
                                                                        ✓ {t('dashboard.controls.accept')}
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="flat"
                                                                        color="danger"
                                                                        className="w-full sm:flex-1 font-black uppercase text-sm h-12 active:scale-95"
                                                                        onPress={() => { handleUpdateStatus(request.match_id, request.user_id, 'refused'); }}
                                                                    >
                                                                        ✕ {t('dashboard.controls.refuse')}
                                                                    </Button>
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    variant="bordered"
                                                                    color="secondary"
                                                                    className="w-full font-bold text-sm h-11 border-secondary/30 text-secondary active:scale-95"
                                                                    onPress={() => { setSelectedClubProfile(request); onProfileOpen(); }}
                                                                >
                                                                    {t('dashboard.labels.view_club_profile')}
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col sm:flex-row gap-2 w-full relative z-20">
                                                                <Button size="sm" variant="flat" className="w-full sm:flex-1 text-sm font-bold h-11 active:scale-95" as={Link} to={`/matches/${request.match_id}`} onClick={(e) => e.stopPropagation()}>{t('dashboard.controls.view')}</Button>
                                                                <Button size="sm" variant="bordered" color="secondary" className="w-full sm:flex-1 text-sm font-bold h-11 border-secondary/30 active:scale-95" onPress={() => { setSelectedClubProfile(request); onProfileOpen(); }}>{t('dashboard.labels.view_profile')}</Button>
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
                                                {requestsSubFilter === 'all' ? t('dashboard.empty.no_requests') : requestsSubFilter === 'match' ? t('dashboard.empty.no_match') : t('dashboard.empty.no_tournament')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Tab>

                        <Tab key="organized" title={<div className="flex items-center space-x-2"><span>{t('dashboard.tabs.organized')}</span>{isLocked && <span className="text-default-400">🔒</span>}</div>}>
                            <div className="flex flex-col gap-4 pt-2">
                                {renderSubFilters(organizedSubFilter, setOrganizedSubFilter)}
                                <MyOrganizationsMemo
                                    events={myAnnouncements}
                                    isLoading={isLoadingAnnouncements}
                                    formatDate={formatDate}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    {isLoadingAnnouncements ? (
                                        <div className="col-span-full flex justify-center py-12"><Spinner color="warning" aria-label={t('loading')} /></div>
                                    ) : filteredOrganized.length > 0 ? (
                                        filteredOrganized.map((match) => (
                                            match.type === 'tournament' ? (
                                                <OrganizedTournamentCard
                                                    key={match.id}
                                                    match={match}
                                                    isTooLate={isTooLate(match.match_date, match.match_time)}
                                                    isSaving={isSaving}
                                                    onDelete={handleDeleteMatch}
                                                    onCloseRegistrations={handleCloseRegistrations}
                                                    formatDate={formatDate}
                                                    formatTime={formatTime}
                                                />
                                            ) : (
                                                <Card key={match.id} className="overflow-hidden border transition-all duration-300 shadow-xl hover:shadow-violet-500/20 border-violet-500/40 bg-zinc-900/90 group">
                                                    <div className="absolute inset-0 bg-linear-to-br from-violet-600/10 via-transparent to-transparent opacity-50"></div>
                                                    <CardBody className="p-0">
                                                        <div className="flex flex-col md:flex-row">
                                                            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/5">
                                                                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                                                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                                                                            {match.club?.logo_url ? (
                                                                                <Image src={match.club.logo_url} className="object-contain" />
                                                                            ) : (
                                                                                <span className="text-white font-black text-2xl">{match.club?.name?.charAt(0)}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <h3 className="font-black text-violet-400 text-xl sm:text-2xl leading-tight uppercase tracking-tighter group-hover:text-violet-300 transition-colors break-words">
                                                                                {t('enums.type.match').toUpperCase()}
                                                                            </h3>
                                                                            <p className="text-white/70 text-xs sm:text-sm font-bold uppercase tracking-widest break-words leading-tight">{match.club?.name || '??'}</p>
                                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                                <Chip size="sm" variant="flat" color="secondary" className="font-black text-[9px] sm:text-xs uppercase tracking-wider h-auto py-0.5 whitespace-normal">
                                                                                    ⚽ {t('enums.type.match')}
                                                                                </Chip>
                                                                                <Chip size="sm" variant="flat" color={match.venue === 'Extérieur' ? 'warning' : 'primary'} className="h-5 text-[9px] uppercase font-black shrink-0">
                                                                                    {match.venue === 'Extérieur' ? t('dashboard.labels.away_badge') : t('dashboard.labels.home_badge')}
                                                                                </Chip>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-start sm:justify-end w-full sm:w-auto sm:max-w-[200px] shrink-0">
                                                                        <Chip size="sm" color={match.status === 'active' ? 'secondary' : 'default'} variant="solid" className="font-black uppercase text-[10px] sm:text-sm py-3 shadow-lg shadow-violet-500/30 whitespace-normal text-center h-auto min-h-8">
                                                                            {match.status === 'active' ? t('dashboard.status.searching') : t(`dashboard.status.${match.status}`, match.status)}
                                                                        </Chip>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                                        <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.date', 'Date')}</p>
                                                                        <p className="text-sm font-bold text-white">{formatDate(match.match_date)}</p>
                                                                    </div>
                                                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                                        <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.time', 'Heure')}</p>
                                                                        <p className="text-sm font-bold text-white">{formatTime(match.match_time)}</p>
                                                                    </div>
                                                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                                        <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.format', 'Format')}</p>
                                                                        <Chip size="sm" variant="dot" color="primary" className="font-black text-xs border-none p-0">{match.format || '11v11'}</Chip>
                                                                    </div>
                                                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                                        <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.pitch_type', 'Terrain')}</p>
                                                                        <p className="text-sm font-bold text-white truncate">{match.pitch_type || '—'}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between items-end">
                                                                        <p className="text-sm font-black text-violet-400 uppercase tracking-widest">
                                                                            {(match.accepted_count || 0) >= 1 ? t('dashboard.match.filled', 'Match complet') : t('dashboard.match.searching', 'Recherche d\'adversaire')}
                                                                        </p>
                                                                        <p className="text-xs font-bold text-white">{match.accepted_count || 0} / 1</p>
                                                                    </div>
                                                                    <Progress
                                                                        size="md"
                                                                        value={(match.accepted_count || 0) >= 1 ? 100 : 0}
                                                                        color="secondary"
                                                                        className="max-w-md"
                                                                        aria-label={t('dashboard.match.filling', 'Remplissage du match')}
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
                                                                            <p className="text-xs sm:text-sm font-black text-danger leading-tight uppercase px-2">
                                                                                {t('dashboard.alerts.h2_locked', 'Événement verrouillé (H-2). Contactez les participants pour tout changement de dernière minute.')}
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className="flex flex-wrap gap-2">
                                                                                <Button
                                                                                    as={Link}
                                                                                    to={`/matches/${match.id}/edit`}
                                                                                    size="sm"
                                                                                    variant="flat"
                                                                                    className="flex-1 min-w-[100px] font-bold text-sm h-11 bg-amber-500/10 text-amber-500 active:scale-95"
                                                                                >
                                                                                    {t('edit')}
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="flat"
                                                                                    color="danger"
                                                                                    className="flex-1 min-w-[100px] h-11 font-bold text-sm active:scale-95"
                                                                                    onPress={() => handleDeleteMatch(match.id, match.match_date, match.match_time)}
                                                                                    isLoading={isSaving}
                                                                                >
                                                                                    {t('delete')}
                                                                                </Button>
                                                                            </div>
                                                                            <Button
                                                                                as={Link}
                                                                                to={`/matches/${match.id}`}
                                                                                size="sm"
                                                                                variant="solid"
                                                                                color="secondary"
                                                                                className="w-full font-bold text-sm h-10 active:scale-95 shadow-md shadow-secondary/20"
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
                                                {organizedSubFilter === 'all' ? t('dashboard.empty.no_organized') : organizedSubFilter === 'match' ? t('dashboard.empty.no_match') : t('dashboard.empty.no_tournament')}
                                            </p>
                                            {organizedSubFilter === 'all' ? (
                                                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                                    <Button as={Link} to="/matches" color="secondary" variant="flat" className="font-bold bg-violet-500/10 text-violet-400 w-full sm:w-auto">{t('dashboard.labels.search_match')}{isLocked && ' 🔒'}</Button>
                                                    <Button as={Link} to="/matches?type=tournament" color="default" variant="flat" className="font-bold bg-purple-300/20 text-purple-400 w-full sm:w-auto">{t('dashboard.labels.search_tournament')}{isLocked && ' 🔒'}</Button>
                                                </div>
                                            ) : (
                                                <Button as={Link} to={organizedSubFilter === 'tournament' ? "/matches?type=tournament" : "/matches"} color={organizedSubFilter === 'tournament' ? 'default' : 'secondary'} variant="flat" className={`font-bold w-full sm:w-auto ${organizedSubFilter === 'tournament' ? 'bg-purple-300/20 text-purple-400' : 'bg-violet-500/10 text-violet-400'}`}>
                                                    {organizedSubFilter === 'tournament' ? t('dashboard.labels.search_tournament') : t('dashboard.labels.search_match')}{isLocked && ' 🔒'}
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
                                    {isLocked && <span className="text-default-400">🔒</span>}
                                    {allConfirmedTournaments.length > 0 && (
                                        <Chip size="sm" variant="solid" color="secondary" className="h-5 min-w-5 px-1 font-black">
                                            {allConfirmedTournaments.length}
                                        </Chip>
                                    )}
                                    {modifiedTournamentCount > 0 && (
                                        <span className="relative flex h-5 min-w-5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                                            <Chip size="sm" variant="solid" color="danger" className="relative h-5 min-w-5 px-1 font-black">
                                                {modifiedTournamentCount}
                                            </Chip>
                                        </span>
                                    )}
                                </div>
                            }
                        >
                            <div className="flex flex-col gap-4 pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    {isLoadingParticipations ? (
                                        <div className="col-span-full flex justify-center py-12"><Spinner color="secondary" aria-label={t('loading')} /></div>
                                    ) : allConfirmedTournaments.length > 0 ? (
                                        allConfirmedTournaments.map((part) => (
                                            <ConfirmedTournamentCard
                                                key={part.match_id}
                                                participation={part}
                                                highlighted={highlightedCardId === part.match_id && showChanges}
                                                isTimeChanged={!!(part.notification_state === 1 && knownData[part.match_id] && knownData[part.match_id].time !== part.match_time)}
                                                onMarkAsRead={markAsRead}
                                                formatDate={formatDate}
                                                formatTime={formatTime}
                                            />
                                        ))
                                    ) : (
                                        <div className="col-span-full py-8 text-center space-y-4">
                                            <p className="text-default-400 font-medium">
                                                {t('dashboard.labels.no_participation_tournament')}
                                            </p>
                                            <Button as={Link} to="/matches?type=tournament" color="default" variant="flat" className="font-bold bg-purple-300/20 text-purple-400 w-full sm:w-auto">{t('dashboard.labels.search_tournament')}</Button>
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
                                    {modifiedMatchCount > 0 && (
                                        <span className="relative flex h-5 min-w-5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                                            <Chip size="sm" variant="solid" color="danger" className="relative h-5 min-w-5 px-1 font-black">
                                                {modifiedMatchCount}
                                            </Chip>
                                        </span>
                                    )}
                                </div>
                            }
                        >
                            <div className="flex flex-col gap-4 pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    {(isLoadingIncoming || isLoadingParticipations) ? (
                                        <div className="col-span-full flex justify-center py-12"><Spinner color="success" aria-label={t('loading')} /></div>
                                    ) : allConfirmedMatches.length > 0 ? (
                                        allConfirmedMatches.map((cm, idx) => (
                                            <ConfirmedMatchCard
                                                key={idx}
                                                match={cm}
                                                highlighted={highlightedCardId === cm.match_id && showChanges}
                                                knownData={knownData[cm.match_id]}
                                                onMarkAsRead={markAsRead}
                                                formatDate={formatDate}
                                                formatTime={formatTime}
                                            />
                                        ))
                                    ) : (
                                        <div className="col-span-full py-8 text-center space-y-6">
                                            <p className="text-default-400 font-medium">
                                                {t('dashboard.labels.no_participation_match')}
                                            </p>
                                            <Button
                                                as={Link}
                                                to="/matches"
                                                color="secondary"
                                                variant="flat"
                                                className="font-bold bg-violet-500/10 text-violet-400 w-full sm:w-auto"
                                            >
                                                {t('dashboard.labels.search_match')}{isLocked && ' 🔒'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Tab>
                    </Tabs>
                </DataWall>
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
                                    <h3 className="text-lg font-black uppercase tracking-tighter text-white">{t('dashboard.profile_modal.title')}</h3>
                                    <p className="text-xs sm:text-sm text-default-400 font-bold uppercase">{t('dashboard.profile_modal.subtitle')}</p>
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
                                                <span className="text-xs sm:text-sm font-black uppercase text-default-400">{t('dashboard.profile_modal.manager')}</span>
                                                <span className="text-sm font-bold text-white uppercase">{selectedClubProfile.requester_firstname || selectedClubProfile.host_firstname} {selectedClubProfile.requester_lastname || selectedClubProfile.host_lastname}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-xs sm:text-sm font-black uppercase text-default-400">{t('dashboard.profile_modal.phone')}</span>
                                                <a href={`tel:${selectedClubProfile.requester_phone || selectedClubProfile.host_phone}`} className="text-sm font-black text-orange-500 hover:animate-pulse">
                                                    {selectedClubProfile.requester_phone || selectedClubProfile.host_phone}
                                                </a>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-xs sm:text-sm font-black uppercase text-default-400">{t('dashboard.profile_modal.email')}</span>
                                                <a href={`mailto:${selectedClubProfile.requester_email || selectedClubProfile.host_email}`} className="text-sm font-bold text-primary hover:underline truncate ml-4">
                                                    {selectedClubProfile.requester_email || selectedClubProfile.host_email}
                                                </a>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-xs sm:text-sm font-black uppercase text-default-400">{t('dashboard.profile_modal.city')}</span>
                                                <span className="text-sm font-bold text-white uppercase tracking-tight">{selectedClubProfile.requester_city || selectedClubProfile.host_city || selectedClubProfile.location_city}</span>
                                            </div>
                                        </div>

                                        {/* Metadata box */}
                                        <div className="mt-2 pt-4 border-t border-white/5 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-default-500 tracking-tighter uppercase font-bold text-[9px]">{t('dashboard.profile_modal.request_date')}</span>
                                                <span className="text-white font-bold">
                                                    {selectedClubProfile.contacted_at ? `${formatTimestamp(selectedClubProfile.contacted_at, t)} ${t('matchForm.labels.at', 'à')} ${formatTimestampTime(selectedClubProfile.contacted_at)}` : t('dashboard.profile_modal.unknown')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-default-500 tracking-tighter uppercase font-bold text-[9px]">{t('dashboard.profile_modal.for_match_on')}</span>
                                                <span className="text-warning-500 font-black">{formatDate(selectedClubProfile.match_date)} {t('matchForm.labels.at', 'à')} {formatTime(selectedClubProfile.match_time)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-center p-8"><Spinner color="warning" aria-label={t('loading')} /></div>
                                )}
                            </ModalBody>
                            <ModalFooter className="border-t border-white/5 pt-4">
                                <Button color="secondary" variant="flat" onPress={onClose} className="font-black uppercase tracking-tighter w-full h-12">
                                    {t('dashboard.profile_modal.close')}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </DefaultLayout>
    );
}
