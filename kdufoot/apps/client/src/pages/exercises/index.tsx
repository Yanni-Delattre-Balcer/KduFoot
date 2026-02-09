
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useExercises } from '@/hooks/use-exercises';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image } from "@heroui/image";

export default function ExercisesPage() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const { exercises, isLoading, isError } = useExercises({ search });

    return (
        <DefaultLayout>
            <section className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">{t('exercises.title', 'Exercices')}</h1>
                    <Button as={Link} to="/exercises/new" color="primary">
                        {t('exercises.create', 'Créer un exercice')}
                    </Button>
                </div>

                <div className="flex gap-4">
                    <Input
                        placeholder={t('search', 'Rechercher...')}
                        value={search}
                        onValueChange={setSearch}
                        className="max-w-xs"
                    />
                </div>

                {isLoading && <Spinner label={t('loading', 'Chargement...')} />}

                {isError && (
                    <div className="text-danger">
                        {t('error.loading_exercises', 'Erreur lors du chargement des exercices')}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exercises.map((exercise) => (
                        <Card key={exercise.id} className="py-4">
                            <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
                                <p className="text-tiny uppercase font-bold">{exercise.category}</p>
                                <small className="text-default-500">{exercise.themes}</small>
                                <h4 className="font-bold text-large">{exercise.title}</h4>
                            </CardHeader>
                            <CardBody className="overflow-visible py-2">
                                <div className="w-full h-40 bg-default-100 rounded-xl flex items-center justify-center">
                                    {exercise.thumbnail_url ? (
                                        <Image
                                            alt="Card background"
                                            className="object-cover rounded-xl"
                                            src={exercise.thumbnail_url}
                                            width={270}
                                        />
                                    ) : (
                                        <span className="text-default-400">No Image</span>
                                    )}
                                </div>
                                <p className="mt-2 text-sm text-default-600 line-clamp-3">
                                    {exercise.synopsis}
                                </p>
                            </CardBody>
                            <CardFooter>
                                <Button as={Link} to={`/exercises/${exercise.id}`} size="sm" variant="flat">
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
