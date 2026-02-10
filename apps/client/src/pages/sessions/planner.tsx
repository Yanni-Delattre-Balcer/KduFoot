import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useSessions } from '@/hooks/use-sessions';
import { useMatches } from '@/hooks/use-matches';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';

import { Button } from '@heroui/button';
import { Link } from 'react-router-dom';
import { Chip } from "@heroui/chip";

export default function SessionPlannerPage() {
    const { t } = useTranslation();
    const [view, setView] = useState<'sessions' | 'matches'>('sessions');
    const { sessions, isError: isErrorSessions } = useSessions({ status: 'scheduled' });
    const { matches, isError: isErrorMatches } = useMatches();

    return (
        <DefaultLayout>
            <section className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-4">
                    <h1 className="text-2xl font-bold mb-2">{t('sessions.title')}</h1>
                    <div className="flex gap-4">
                        <Button
                            color={view === 'sessions' ? "primary" : "default"}
                            variant={view === 'sessions' ? "solid" : "bordered"}
                            onPress={() => setView('sessions')}
                            size="lg"
                        >
                            {t('mySessions')}
                        </Button>
                        <Button
                            color={view === 'matches' ? "primary" : "default"}
                            variant={view === 'matches' ? "solid" : "bordered"}
                            onPress={() => setView('matches')}
                            size="lg"
                        >
                            {t('myMatches')}
                        </Button>
                    </div>
                </div>

                {view === 'sessions' && (
                    <div className="flex flex-col gap-4 animate-appearance-in">
                        {null}
                        {isErrorSessions && <div className="text-danger">{t('error.loading_sessions')}</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sessions.map((session) => (
                                <Card key={session.id} className="py-4">
                                    <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
                                        <div className="flex justify-between w-full">
                                            <p className="text-tiny uppercase font-bold">{session.category}</p>
                                            <Chip size="sm" color={session.status === 'completed' ? 'success' : 'primary'}>{session.status}</Chip>
                                        </div>
                                        <h4 className="font-bold text-large">{session.name || t('session.untitled')}</h4>
                                        <small className="text-default-500">
                                            {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : 'Non planifiée'}
                                        </small>
                                    </CardHeader>
                                    <CardBody className="overflow-visible py-2">
                                        <p className="text-sm text-default-600">
                                            {t('session.duration')}: {session.total_duration} min
                                        </p>
                                        <p className="text-sm text-default-600">
                                            {t('session.exercises_count')}: {session.exercises?.length || 0}
                                        </p>
                                    </CardBody>
                                    <CardFooter>
                                        <Button as={Link} to={`/sessions/${session.id}`} size="sm" variant="flat">
                                            {t('details')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'matches' && (
                    <div className="flex flex-col gap-4 animate-appearance-in">
                        {null}
                        {isErrorMatches && <div className="text-danger">{t('error.loading_matches', 'Erreur chargement matchs')}</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {matches.map((match) => (
                                <Card key={match.id} className="py-4">
                                    <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
                                        <div className="flex justify-between w-full">
                                            <p className="text-tiny uppercase font-bold">{match.category} - {match.format}</p>
                                            <Chip size="sm" variant="flat">{match.venue}</Chip>
                                        </div>
                                        <h4 className="font-bold text-large">vs {match.club?.name || 'Adversaire'}</h4>
                                        <small className="text-default-500">
                                            {match.match_date ? new Date(match.match_date).toLocaleDateString() : ''} {match.match_time}
                                        </small>
                                    </CardHeader>
                                    <CardBody className="overflow-visible py-2">
                                        <p className="text-sm text-default-600">
                                            {t('status')}: {match.status}
                                        </p>
                                        {match.notes && <p className="text-sm text-default-500 italic truncate">{match.notes}</p>}
                                    </CardBody>
                                    <CardFooter>
                                        <Button as={Link} to={`/matches/${match.id}`} size="sm" variant="flat">
                                            {t('details')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </DefaultLayout>
    );
}
