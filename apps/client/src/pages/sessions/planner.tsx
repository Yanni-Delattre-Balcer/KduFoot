import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useSessions } from '@/hooks/use-sessions';
import { useMatches } from '@/hooks/use-matches';
import FootballClock from '../../components/football-clock';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';

import { Button } from '@heroui/button';
import { Link } from 'react-router-dom';
import { Chip } from "@heroui/chip";
import { showVideoAnalysis } from '@/config/site';

export default function SessionPlannerPage() {
    const { t, i18n } = useTranslation();
    const [view, setView] = useState<'sessions' | 'matches'>('sessions');
    const { sessions, isError: isErrorSessions } = useSessions({ status: 'scheduled' });
    const { matches, isError: isErrorMatches } = useMatches();

    return (
        <DefaultLayout maxWidth="max-w-full">
            <section className="flex flex-col gap-6 w-full px-4">

                {/* Hero - Mes Séances */}
                <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-red-600/15 via-rose-500/10 to-orange-500/10 border border-red-500/20">
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
                            <div className="p-3 rounded-2xl bg-red-500/10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5M9 12h1.5m3 0h1.5m-3 3h1.5m-1.5 3h1.5" />
                                </svg>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-red-500 to-rose-600">
                                {showVideoAnalysis ? t('sessions.title') : t('sessions.title_public')}
                            </h1>
                        </div>
                        <p className="text-default-500 text-lg max-w-lg">
                            {view === 'sessions'
                                ? t('sessions.description_sessions')
                                : t('sessions.description_matches')}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 p-1 rounded-2xl bg-default-100/50 backdrop-blur-sm w-full sm:w-auto">
                            <Button
                                color={view === 'sessions' ? "success" : "default"}
                                variant={view === 'sessions' ? "shadow" : "light"}
                                onPress={() => setView('sessions')}
                                size="lg"
                                className={view === 'sessions' ? "font-bold text-white bg-linear-to-r from-[#17c964] to-[#12a150]" : ""}
                                startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5M9 12h1.5m3 0h1.5m-3 3h1.5m-1.5 3h1.5" />
                                    </svg>
                                }
                            >
                                {t('mySessions')}
                            </Button>
                            <Button
                                color={view === 'matches' ? "warning" : "default"}
                                variant={view === 'matches' ? "shadow" : "light"}
                                onPress={() => setView('matches')}
                                size="lg"
                                className={view === 'matches' ? "font-bold text-white bg-linear-to-r from-orange-500 to-amber-500" : ""}
                                startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m11.372-5.362c.962-.203 1.934-.377 2.916-.52M19.5 4.5c.125.163.233.332.322.508M19.5 4.5v.243a12.98 12.98 0 0 1-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35" />
                                    </svg>
                                }
                            >
                                {t('myMatches')}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="animate-appearance-in">

                    {view === 'sessions' && (
                        <div className="flex flex-col gap-4">
                            {isErrorSessions && <div className="text-danger p-4 rounded-xl bg-danger/10 border border-danger/20">{t('error.loading_sessions')}</div>}

                            {sessions.length === 0 && !isErrorSessions && (
                                <Card className="border border-red-500/20 bg-[#251818]">
                                    <CardBody className="py-16 flex flex-col items-center gap-4 text-center">
                                        <div className="p-4 rounded-full bg-green-500/10">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-green-500">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                            </svg>
                                        </div>
                                        <p className="text-lg font-bold text-green-900/80 dark:text-green-100">{t('sessions.empty_sessions')}</p>
                                        <Button as={Link} to="/training" color="success" variant="flat" className="mt-2 text-green-600 bg-green-100 dark:bg-green-500/20 dark:text-green-300 font-bold">
                                            {t('sessions.create')}
                                        </Button>
                                    </CardBody>
                                </Card>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sessions.map((session) => (
                                    <Card key={session.id} className="group hover:shadow-lg hover:shadow-red-500/10 transition-all bg-[#251818] border border-red-500/20 hover:border-red-500/40">
                                        <CardHeader className="pb-0 pt-4 px-4 flex-col items-start gap-1">
                                            <div className="flex justify-between w-full">
                                                <Chip size="sm" variant="flat" color="danger" className="font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">{session.category}</Chip>
                                                <Chip size="sm" color={session.status === 'completed' ? 'success' : 'primary'} variant={session.status === 'completed' ? 'solid' : 'dot'}>
                                                    {session.status}
                                                </Chip>
                                            </div>
                                            <h4 className="font-bold text-large truncate group-hover:text-red-600 transition-colors">{session.name || t('session.untitled')}</h4>
                                        </CardHeader>
                                        <CardBody className="overflow-visible py-3">
                                            <div className="flex items-center gap-2 text-default-500 text-sm mb-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                                </svg>
                                                {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString(i18n.language) : t('sessions.not_scheduled')}
                                            </div>
                                            <div className="flex gap-3 text-sm text-default-600">
                                                <div className="flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-danger">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                    </svg>
                                                    <span>{session.total_duration} min</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                                                    </svg>
                                                    <span>{session.exercises?.length || 0} ex.</span>
                                                </div>
                                            </div>
                                        </CardBody>
                                        <CardFooter>
                                            <Button as={Link} to={`/sessions/${session.id}`} size="sm" variant="flat" fullWidth color="danger" className="font-semibold">
                                                {t('details')}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'matches' && (
                        <div className="flex flex-col gap-4">
                            {isErrorMatches && <div className="text-danger p-4 rounded-xl bg-danger/10 border border-danger/20">{t('error.loading_matches', 'Erreur chargement matchs')}</div>}

                            {matches.length === 0 && !isErrorMatches && (
                                <Card className="border border-red-500/20 bg-[#251818]">
                                    <CardBody className="py-16 flex flex-col items-center gap-4 text-center">
                                        <div className="p-4 rounded-full bg-orange-500/10">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-orange-500">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m11.372-5.362c.962-.203 1.934-.377 2.916-.52M19.5 4.5c.125.163.233.332.322.508M19.5 4.5v.243a12.98 12.98 0 0 1-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35" />
                                            </svg>
                                        </div>
                                        <p className="text-lg font-semibold text-orange-900/80 dark:text-orange-100">{t('sessions.empty_matches')}</p>
                                        <Button as={Link} to="/matches" color="warning" variant="flat" className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 font-bold">
                                            {t('match.find')}
                                        </Button>
                                    </CardBody>
                                </Card>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {matches.map((match) => (
                                    <Card key={match.id} className="group hover:shadow-lg hover:shadow-red-500/10 transition-all bg-[#251818] border border-red-500/20 hover:border-red-500/40">
                                        <CardHeader className="pb-0 pt-4 px-4 flex-col items-start">
                                            <div className="flex justify-between w-full">
                                                <p className="text-tiny uppercase font-bold text-red-600">{match.category} - {match.format}</p>
                                                <Chip size="sm" variant="flat" className="bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300">{t(`enums.venue.${match.venue}`)}</Chip>
                                            </div>
                                            <h4 className="font-bold text-large mt-1 truncate group-hover:text-red-600 transition-colors">vs {match.club?.name || t('sessions.opponent_default')}</h4>
                                            <small className="text-default-500 flex items-center gap-1 mt-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                                </svg>
                                                {match.match_date ? new Date(match.match_date).toLocaleDateString(i18n.language) : ''} {match.match_time}
                                            </small>
                                        </CardHeader>
                                        <CardBody className="overflow-visible py-2">
                                            <p className="text-sm text-default-600">
                                                {t('sessions.status')}: {match.status}
                                            </p>
                                            {match.notes && <p className="text-sm text-default-500 italic truncate">{match.notes}</p>}
                                        </CardBody>
                                        <CardFooter>
                                            <Button as={Link} to={`/matches/${match.id}`} size="sm" variant="flat" className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-bold w-full">
                                                {t('details')}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </section >
        </DefaultLayout >
    );
}
