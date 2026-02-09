
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useSession } from '@/hooks/use-sessions';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { Chip } from "@heroui/chip";
import { Card, CardBody, CardHeader } from '@heroui/card';

export default function SessionDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { session, isLoading, isError } = useSession(id || null);

    if (isLoading) {
        return (
            <DefaultLayout>
                <div className="flex justify-center items-center h-[50vh]">
                    <Spinner label={t('loading', 'Chargement...')} />
                </div>
            </DefaultLayout>
        );
    }

    if (isError || !session) {
        return (
            <DefaultLayout>
                <div className="flex flex-col items-center justify-center gap-4 h-[50vh]">
                    <h1 className="text-2xl font-bold text-danger">{t('error.not_found', 'Séance non trouvée')}</h1>
                    <Button as={Link} to="/sessions" color="primary">
                        {t('back_to_list', 'Retour au planning')}
                    </Button>
                </div>
            </DefaultLayout>
        );
    }

    return (
        <DefaultLayout>
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{session.name || t('session.untitled', 'Séance sans titre')}</h1>
                        <div className="flex gap-2 flex-wrap items-center">
                            <Chip color="primary" variant="flat">{session.category}</Chip>
                            <Chip variant="bordered">{session.total_duration} min</Chip>
                            <span className="text-default-500 text-sm">
                                {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : 'Non planifiée'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button as={Link} to={`/sessions/${id}/edit`} color="secondary" variant="flat">
                            {t('edit', 'Modifier')}
                        </Button>
                        <Button as={Link} to="/sessions" variant="light">
                            {t('back', 'Retour')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 flex flex-col gap-4">
                        <h2 className="text-xl font-bold">Timeline de la séance</h2>
                        {session.exercises && session.exercises.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {session.exercises.sort((a, b) => a.order_index - b.order_index).map((item) => (
                                    <Card key={item.exercise_id} className="w-full">
                                        <CardBody className="flex flex-row gap-4 p-4">
                                            <div className="flex items-center justify-center bg-primary/10 rounded-lg min-w-[80px] h-20 text-primary font-bold text-xl">
                                                {item.duration}'
                                            </div>
                                            <div className="flex flex-col flex-grow justify-center">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-lg">{item.exercise?.title}</h3>
                                                    <Button as={Link} to={`/exercises/${item.exercise_id}`} size="sm" variant="light" isIconOnly>
                                                        Details
                                                    </Button>
                                                </div>
                                                <p className="text-sm text-default-500 line-clamp-2">{item.exercise?.synopsis}</p>
                                            </div>
                                        </CardBody>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card><CardBody className="text-center text-default-500 py-8">Aucun exercice ajouté à cette séance.</CardBody></Card>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        <Card>
                            <CardHeader className="font-bold bg-default-50">Résumé</CardHeader>
                            <CardBody className="gap-2">
                                <div className="flex justify-between border-b border-default-100 pb-1">
                                    <span className="text-default-500">Durée Totale</span>
                                    <span className="font-semibold">{session.total_duration} min</span>
                                </div>
                                <div className="flex justify-between border-b border-default-100 pb-1">
                                    <span className="text-default-500">Exercices</span>
                                    <span className="font-semibold">{session.exercises?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-default-500">Statut</span>
                                    <Chip size="sm" color={session.status === 'completed' ? 'success' : 'primary'}>{session.status}</Chip>
                                </div>
                            </CardBody>
                        </Card>

                        {session.constraints && (
                            <Card>
                                <CardHeader className="font-bold bg-default-50">Contraintes</CardHeader>
                                <CardBody className="gap-2">
                                    {session.constraints.players && (
                                        <div className="flex justify-between">
                                            <span className="text-default-500">Joueurs</span>
                                            <span>{session.constraints.players}</span>
                                        </div>
                                    )}
                                    {session.constraints.equipment && (
                                        <div className="flex flex-col">
                                            <span className="text-default-500 text-sm">Matériel</span>
                                            <span>{session.constraints.equipment}</span>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </DefaultLayout>
    );
}
