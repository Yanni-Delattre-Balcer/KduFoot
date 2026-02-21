import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useSessions } from '@/hooks/use-sessions';
import { useMatches } from '@/hooks/use-matches';
import FootballClock from '../../components/football-clock';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';

import { Button } from '@heroui/button';
import { Link } from 'react-router-dom';
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Spinner } from "@heroui/spinner";
import { matchService } from '@/services/matches';
import { useAuth0 } from '@auth0/auth0-react';
import { showVideoAnalysis } from '@/config/site';

export default function SessionPlannerPage() {
    const { t, i18n } = useTranslation();
    const { getAccessTokenSilently } = useAuth0();
    const [view, setView] = useState<'exercises' | 'matches' | 'tournaments'>(showVideoAnalysis ? 'exercises' : 'matches');
    const { sessions, isError: isErrorSessions } = useSessions();
    const { matches, isLoading: isLoadingMatches } = useMatches({ owner_id: 'me', include_past: true });
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);

    useEffect(() => {
        const fetchRequests = async () => {
            setIsLoadingRequests(true);
            try {
                const token = await getAccessTokenSilently();
                const res = await matchService.getRequests(token);
                if (res.success) setRequests(res.requests);
            } catch (e) {
                console.error("Failed to fetch requests", e);
            } finally {
                setIsLoadingRequests(false);
            }
        };
        if (!showVideoAnalysis || view !== 'exercises') {
            fetchRequests();
        }
    }, [getAccessTokenSilently, view]);

    return (
        <DefaultLayout maxWidth="max-w-full">
            <section className="flex flex-col gap-6 w-full px-4">

                {/* Hero - Historique */}
                <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600/20 via-indigo-400/15 to-transparent border border-indigo-600/20">
                    {/* Grass stripes - standard green */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34,197,94,0.3) 40px, rgba(34,197,94,0.3) 80px)' }}></div>
                    {/* Field center line + circle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-b from-transparent via-white/5 to-transparent"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5"></div>

                    {/* Football clock - top right */}
                    <div className="hidden md:block absolute top-4 right-4 z-10">
                        <FootballClock size={140} />
                    </div>

                    <div className="relative flex flex-col items-center gap-6 py-14 px-6 text-center">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-indigo-600/10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-600 via-indigo-400 to-indigo-600">
                                {showVideoAnalysis ? t('sessions.title') : t('sessions.title_public')}
                            </h1>
                        </div>
                        <p className="text-default-500 text-lg max-w-lg">
                            {view === 'exercises' 
                                ? t('sessions.description_exercises', 'Suivez vos séances d\'entraînement et exercices vidéo.')
                                : view === 'matches'
                                    ? t('sessions.description_matches')
                                    : t('matchesPage.description_create_tournament')}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 p-1 rounded-2xl bg-default-100/50 backdrop-blur-sm w-full sm:w-auto">
                            {showVideoAnalysis && (
                                <Button
                                    color={view === 'exercises' ? "success" : "default"}
                                    variant={view === 'exercises' ? "shadow" : "light"}
                                    onPress={() => setView('exercises')}
                                    size="lg"
                                    className={view === 'exercises' ? "font-bold text-white bg-linear-to-r from-[#17c964] to-[#12a150]" : ""}
                                    startContent={
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                        </svg>
                                    }
                                >
                                    {t('favorites.tab_exercises')}
                                </Button>
                            )}
                            <Button
                                color={view === 'matches' ? "secondary" : "default"}
                                variant={view === 'matches' ? "shadow" : "light"}
                                onPress={() => setView('matches')}
                                size="lg"
                                className={view === 'matches' ? "font-bold text-white bg-linear-to-r from-violet-500 to-purple-500" : ""}
                                startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m11.372-5.362c.962-.203 1.934-.377 2.916-.52M19.5 4.5c.125.163.233.332.322.508M19.5 4.5v.243a12.98 12.98 0 0 1-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35" />
                                    </svg>
                                }
                            >
                                {t('myMatches')}
                            </Button>
                            <Button
                                color={view === 'tournaments' ? "default" : "default"}
                                variant={view === 'tournaments' ? "shadow" : "light"}
                                onPress={() => setView('tournaments')}
                                size="lg"
                                className={view === 'tournaments' ? "font-bold text-purple-900 shadow-lg shadow-purple-500/20 bg-purple-400" : ""}
                                startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.385a.563.563 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                                    </svg>
                                }
                            >
                                {t('match.tab_tournaments', 'Tournois')}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="animate-appearance-in">

                    {view === 'exercises' && (
                        <div className="flex flex-col gap-4">
                            {isErrorSessions && <div className="text-danger p-4 rounded-xl bg-danger/10 border border-danger/20">{t('error.loading_sessions', 'Erreur chargement séances')}</div>}

                            {sessions.length === 0 && !isErrorSessions && (
                                <Card className="border border-green-500/20 bg-green-500/5">
                                    <CardBody className="py-8 flex flex-col items-center gap-4 text-center">
                                        <div className="p-4 rounded-full bg-green-500/10">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-green-500">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                            </svg>
                                        </div>
                                        <p className="text-lg font-semibold text-green-900/80 dark:text-green-100">{t('sessions.empty_sessions', 'Aucune séance trouvée')}</p>
                                        <Button as={Link} to="/exercises" color="success" variant="flat" className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-bold">
                                            {t('sessions.find_exercises', 'Découvrir des exercices')}
                                        </Button>
                                    </CardBody>
                                </Card>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sessions.map((session) => (
                                    <Card key={session.id} className="group hover:shadow-lg hover:shadow-green-500/10 transition-all bg-[#18251e] border border-green-500/20 hover:border-green-500/40">
                                        <CardHeader className="pb-0 pt-4 px-4 flex-col items-start">
                                            <div className="flex justify-between w-full">
                                                <p className="text-tiny uppercase font-bold text-green-600">{session.category || 'Séance'}</p>
                                                <Chip size="sm" variant="flat" className="bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300">{session.status}</Chip>
                                            </div>
                                            <h4 className="font-bold text-large mt-1 truncate group-hover:text-green-600 transition-colors">{session.name || t('sessions.no_name', 'Séance sans nom')}</h4>
                                            <small className="text-default-500 flex items-center gap-1 mt-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                                </svg>
                                                {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString(i18n.language) : ''}
                                            </small>
                                        </CardHeader>
                                        <CardBody className="overflow-visible py-2">
                                            <p className="text-sm text-default-600 line-clamp-2">
                                                {session.category} - {session.level || t('sessions.all_levels', 'Tous niveaux')}
                                            </p>
                                        </CardBody>
                                        <CardFooter>
                                            <Button as={Link} to={`/sessions/${session.id}`} size="sm" variant="flat" className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-bold w-full">
                                                {t('details')}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {(view === 'matches' || view === 'tournaments') && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                            {/* Colonne Gauche: Mes Annonces */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 px-2">
                                    <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Mes Annonces</h2>
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-bold text-default-400">
                                        {matches?.filter(m => view === 'matches' ? m.type === 'match' : m.type === 'tournament').length || 0}
                                    </span>
                                </div>
                                
                                {isLoadingMatches ? (
                                    <div className="flex justify-center py-6 px-4"><Spinner color="secondary" /></div>
                                ) : matches && matches.length > 0 ? (
                                    <div className="flex flex-col gap-4">
                                        {matches.filter(m => view === 'matches' ? m.type === 'match' : m.type === 'tournament').map((match) => (
                                            <Card key={match.id} as={Link} to={`/matches/${match.id}`} className="bg-default-50/5 hover:bg-default-50/10 border border-default-100/10 transition-all group">
                                                <CardBody className="flex flex-row items-center gap-4 p-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${match.type === 'tournament' ? 'bg-purple-500/20 text-purple-500' : 'bg-violet-500/20 text-violet-500'}`}>
                                                        {match.type === 'tournament' ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" /><path d="m3.265 10.602 7.641 4.114a.75.75 0 0 0 .712 0l7.641-4.114.679.365a.75.75 0 0 1 0 1.32l-8.32 4.48a.75.75 0 0 1-.712 0l-8.32-4.48a.75.75 0 0 1 0-1.32l.679-.365Z" /></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Z" /></svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{match.match_date}</span>
                                                            <Chip size="sm" variant="flat" color={match.status === 'active' ? 'success' : 'default'} className="h-4 text-[9px] uppercase font-black">{match.status}</Chip>
                                                        </div>
                                                        <h3 className="font-bold text-white truncate text-base">
                                                            {match.type === 'tournament' ? match.name : `Match vs ${match.club?.name || '??'}`}
                                                        </h3>
                                                        <p className="text-xs text-default-500 font-medium truncate">{match.club?.city} • {t(`enums.category.${match.category}`)}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs font-black text-primary uppercase tracking-tighter">{match.contacts_count || 0} Demandes</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                                        </svg>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl py-6 px-4 text-center flex flex-col items-center gap-4">
                                        <p className="text-default-400 font-medium">Aucune annonce publiée.</p>
                                        <Button as={Link} to={view === 'tournaments' ? "/matches/new?type=tournament" : "/matches/new"} color={view === 'tournaments' ? "default" : "secondary"} variant="flat" size="sm" className={`font-bold ${view === 'tournaments' ? 'bg-purple-300/20 text-purple-400' : 'bg-violet-500/10 text-violet-400'}`}>Créer une annonce</Button>
                                    </div>
                                )}
                            </div>

                            {/* Colonne Droite: Demandes Reçues */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 px-2">
                                    <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Demandes Reçues</h2>
                                    {requests.filter(r => r.request_status === 'pending').length > 0 && (
                                        <span className="bg-violet-500 px-2 py-0.5 rounded text-xs font-bold text-white leading-tight animate-pulse">
                                            {requests.filter(r => r.request_status === 'pending').length}
                                        </span>
                                    )}
                                </div>

                                {isLoadingRequests ? (
                                    <div className="flex justify-center py-6 px-4"><Spinner color="primary" /></div>
                                ) : requests.length > 0 ? (
                                    <div className="flex flex-col gap-4">
                                        {requests
                                            .filter(r => view === 'matches' ? r.type === 'match' : r.type === 'tournament')
                                            .map((request, idx) => (
                                            <Card key={idx} className={`bg-[#1e1e20] border ${request.request_status === 'accepted' ? 'border-success/30' : 'border-default-100/10'}`}>
                                                <CardBody className="p-4 flex flex-col gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                                                            {request.requester_club_logo ? (
                                                                <Image src={request.requester_club_logo} className="object-contain" />
                                                            ) : (
                                                                <span className="text-white font-bold">{request.requester_club_name?.charAt(0)}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <h3 className="font-bold text-white text-sm line-clamp-1">{request.requester_club_name}</h3>
                                                            <p className="text-[10px] text-default-500 font-bold uppercase tracking-widest truncate">
                                                                {t(`enums.category.${request.category}`)} • {request.match_date}
                                                            </p>
                                                        </div>
                                                        <Chip size="sm" color={request.request_status === 'accepted' ? 'success' : request.request_status === 'refused' ? 'danger' : 'warning'} variant="flat" className="font-black uppercase text-[9px]">
                                                            {request.request_status}
                                                        </Chip>
                                                    </div>
                                                    
                                                    {request.request_status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <Button size="sm" color="success" className="flex-1 font-black uppercase text-[10px] h-8 text-success-950" onPress={async () => {
                                                                if (confirm(t('matchForm.confirm.accept', 'Accepter cette demande ?'))) {
                                                                    const token = await getAccessTokenSilently();
                                                                    await matchService.updateRequestStatus(request.match_id, request.user_id, 'accepted', token);
                                                                    window.location.reload();
                                                                }
                                                            }}>Accepter</Button>
                                                            <Button size="sm" variant="flat" color="danger" className="flex-1 font-black uppercase text-[10px] h-8" onPress={async () => {
                                                                if (confirm(t('matchForm.confirm.refuse', 'Refuser cette demande ?'))) {
                                                                    const token = await getAccessTokenSilently();
                                                                    await matchService.updateRequestStatus(request.match_id, request.user_id, 'refused', token);
                                                                    window.location.reload();
                                                                }
                                                            }}>Refuser</Button>
                                                        </div>
                                                    )}
                                                    
                                                    <Button size="sm" variant="flat" className={`w-full text-[10px] font-bold h-7 ${request.type === 'tournament' ? 'bg-purple-300/10 text-purple-400' : 'bg-violet-500/10 text-violet-400'}`} as={Link} to={`/matches/${request.match_id}`}>Voir l'annonce</Button>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl py-6 px-4 text-center flex flex-col items-center gap-4">
                                        <div className="p-4 bg-white/5 rounded-full text-white/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                                            </svg>
                                        </div>
                                        <p className="text-default-400 font-medium">Aucune demande reçue pour le moment.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </section >
        </DefaultLayout >
    );
}
