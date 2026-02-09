
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useExercise } from '@/hooks/use-exercises';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { Image } from "@heroui/image";
import { Chip } from "@heroui/chip";
import { Card, CardBody, CardHeader } from '@heroui/card';

export default function ExerciseDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { exercise, isLoading, isError } = useExercise(id || null);

    if (isLoading) {
        return (
            <DefaultLayout>
                <div className="flexjustify-center items-center h-[50vh]">
                    <Spinner label={t('loading', 'Chargement...')} />
                </div>
            </DefaultLayout>
        );
    }

    if (isError || !exercise) {
        return (
            <DefaultLayout>
                <div className="flex flex-col items-center justify-center gap-4 h-[50vh]">
                    <h1 className="text-2xl font-bold text-danger">{t('error.not_found', 'Exercice non trouvé')}</h1>
                    <Button as={Link} to="/exercises" color="primary">
                        {t('back_to_list', 'Retour à la liste')}
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
                        <h1 className="text-3xl font-bold mb-2">{exercise.title}</h1>
                        <div className="flex gap-2 flex-wrap">
                            <Chip color="primary" variant="flat">{exercise.category}</Chip>
                            <Chip color="secondary" variant="flat">{exercise.level}</Chip>
                            <Chip variant="bordered">{exercise.duration} min</Chip>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button as={Link} to={`/exercises/${id}/edit`} color="secondary" variant="flat">
                            {t('edit', 'Modifier')}
                        </Button>
                        <Button as={Link} to="/exercises" variant="light">
                            {t('back', 'Retour')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardBody className="overflow-visible p-0 bg-default-100 flex items-center justify-center min-h-[300px]">
                            {exercise.thumbnail_url ? (
                                <Image
                                    alt={exercise.title}
                                    className="object-cover w-full h-full"
                                    src={exercise.thumbnail_url}
                                />
                            ) : (
                                <span className="text-default-400">No Image</span>
                            )}
                        </CardBody>
                    </Card>

                    <div className="flex flex-col gap-4">
                        <Card>
                            <CardHeader className="font-bold">{t('exercise.synopsis', 'Synopsis')}</CardHeader>
                            <CardBody>
                                <p className="text-default-600 whitespace-pre-wrap">{exercise.synopsis}</p>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader className="font-bold">{t('exercise.details', 'Détails')}</CardHeader>
                            <CardBody className="gap-2">
                                <div className="flex justify-between border-b border-default-100 pb-1">
                                    <span className="text-default-500">{t('exercise.themes', 'Thèmes')}</span>
                                    <span className="font-semibold text-right">{Array.isArray(exercise.themes) ? exercise.themes.join(', ') : exercise.themes}</span>
                                </div>
                                <div className="flex justify-between border-b border-default-100 pb-1">
                                    <span className="text-default-500">{t('exercise.players', 'Joueurs')}</span>
                                    <span className="font-semibold">{exercise.nb_joueurs}</span>
                                </div>
                                <div className="flex justify-between border-b border-default-100 pb-1">
                                    <span className="text-default-500">{t('exercise.dimensions', 'Dimensions')}</span>
                                    <span className="font-semibold">{exercise.dimensions}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-default-500">{t('exercise.equipment', 'Matériel')}</span>
                                    <span className="font-semibold text-right">{exercise.materiel}</span>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>

                {exercise.svg_schema && (
                    <Card>
                        <CardHeader className="font-bold">{t('exercise.schema', 'Schéma Tactic')}</CardHeader>
                        <CardBody className="flex items-center justify-center bg-white p-4">
                            <div dangerouslySetInnerHTML={{ __html: exercise.svg_schema }} className="w-full max-w-2xl" />
                        </CardBody>
                    </Card>
                )}
            </div>
        </DefaultLayout>
    );
}
