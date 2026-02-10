import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '../../layouts/default';
import { useMatches } from '../../hooks/use-matches';
import MatchForm from '../../components/matches/match-form';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';

import { Button } from '@heroui/button';
import { Link } from 'react-router-dom';
import { Chip } from "@heroui/chip";

export default function MatchesPage() {
    const { t } = useTranslation();
    const [view, setView] = useState<'find' | 'create'>('find');
    const { matches, isError } = useMatches();

    const handleCreateSuccess = () => {
        setView('find'); // Switch back to list
    };

    return (
        <DefaultLayout>
            <section className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-4">
                    <h1 className="text-2xl font-bold mb-2">{t('matches.title', 'Matchs')}</h1>
                    <div className="flex gap-4">
                        <Button
                            color={view === 'find' ? "primary" : "default"}
                            variant={view === 'find' ? "solid" : "bordered"}
                            onPress={() => setView('find')}
                            size="lg"
                        >
                            {t('match.find', 'Trouver un match')}
                        </Button>
                        <Button
                            color={view === 'create' ? "primary" : "default"}
                            variant={view === 'create' ? "solid" : "bordered"}
                            onPress={() => setView('create')}
                            size="lg"
                        >
                            {t('match.create', 'Créer un match')}
                        </Button>
                    </div>
                </div>

                {view === 'find' && (
                    <div className="flex flex-col gap-4 animate-appearance-in">


                        {isError && (
                            <div className="text-danger">
                                {t('error.loading_matches', 'Erreur lors du chargement des matchs')}
                            </div>
                        )}

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
                                            {new Date(match.match_date).toLocaleDateString()} à {match.match_time}
                                        </small>
                                    </CardHeader>
                                    <CardBody className="overflow-visible py-2">
                                        <p className="text-sm text-default-600">
                                            {t('status', 'Statut')}: {match.status}
                                        </p>
                                        {match.notes && <p className="text-sm text-default-500 italic truncate">{match.notes}</p>}
                                    </CardBody>
                                    <CardFooter>
                                        <Button as={Link} to={`/matches/${match.id}`} size="sm" variant="flat">
                                            {t('details', 'Voir détails')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'create' && (
                    <div className="animate-appearance-in max-w-4xl mx-auto w-full">
                        <MatchForm onSuccess={handleCreateSuccess} />
                    </div>
                )}
            </section>
        </DefaultLayout>
    );
}
