
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useSessions } from '@/hooks/use-sessions';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { Link } from 'react-router-dom';
import { Chip } from "@heroui/chip";

export default function SessionPlannerPage() {
    const { t } = useTranslation();
    const { sessions, isLoading, isError } = useSessions({ status: 'scheduled' }); // Show scheduled by default? Or all?

    return (
        <DefaultLayout>
            <section className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">{t('sessions.title', 'Séances')}</h1>
                    <Button as={Link} to="/sessions/new" color="primary">
                        {t('sessions.create', 'Planifier une séance')}
                    </Button>
                </div>

                {isLoading && <Spinner label={t('loading', 'Chargement...')} />}

                {isError && (
                    <div className="text-danger">
                        {t('error.loading_sessions', 'Erreur lors du chargement des séances')}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sessions.map((session) => (
                        <Card key={session.id} className="py-4">
                            <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
                                <div className="flex justify-between w-full">
                                    <p className="text-tiny uppercase font-bold">{session.category}</p>
                                    <Chip size="sm" color={session.status === 'completed' ? 'success' : 'primary'}>{session.status}</Chip>
                                </div>
                                <h4 className="font-bold text-large">{session.name || t('session.untitled', 'Séance sans titre')}</h4>
                                <small className="text-default-500">
                                    {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : 'Non planifiée'}
                                </small>
                            </CardHeader>
                            <CardBody className="overflow-visible py-2">
                                <p className="text-sm text-default-600">
                                    {t('session.duration', 'Durée')}: {session.total_duration} min
                                </p>
                                <p className="text-sm text-default-600">
                                    {t('session.exercises_count', 'Exercices')}: {session.exercises?.length || 0}
                                </p>
                            </CardBody>
                            <CardFooter>
                                <Button as={Link} to={`/sessions/${session.id}`} size="sm" variant="flat">
                                    {t('details', 'Voir détails')}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </section>
        </DefaultLayout>
    );
}
