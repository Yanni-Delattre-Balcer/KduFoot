
import { useTranslation } from 'react-i18next';
import DefaultLayout from '../../layouts/default';
import { useExercises } from '../../hooks/use-exercises';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';

import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image } from "@heroui/image";
import { useTraining } from '../../contexts/training-context';

export default function ExercisesPage() {
    const { t } = useTranslation();
    const [videoUrl, setVideoUrl] = useState('');
    const { addExercise, removeExercise, selectedExercises } = useTraining();
    const isInTraining = (id: string) => selectedExercises.some(e => e.id === id);

    const handleAnalyze = () => {
        // TODO: Implement analysis logic
        console.log('Analyze:', videoUrl);
    };

    const { exercises, isError } = useExercises({});

    return (
        <DefaultLayout>
            <section className="flex flex-col gap-8">
                <div className="flex flex-col items-center gap-4 w-full max-w-3xl mx-auto py-12">
                    <Input
                        placeholder={t('video.urlPlaceholder')}
                        value={videoUrl}
                        onValueChange={setVideoUrl}
                        size="lg"
                        classNames={{
                            inputWrapper: "h-14 px-6",
                            input: "text-lg",
                        }}
                        startContent={
                            <div className="pointer-events-none flex items-center pr-2">
                                <span className="text-default-400 text-xl">🔗</span>
                            </div>
                        }
                    />
                    <Button
                        color="primary"
                        size="lg"
                        className="w-full md:w-auto px-12 font-bold text-lg"
                        onPress={handleAnalyze}
                    >
                        {t('video.analyze')}
                    </Button>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">{t('myExercises')}</h2>
                        <Button as={Link} to="/exercises/new" variant="light" color="primary" size="sm">
                            {t('exercises.create')}
                        </Button>
                    </div>



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
                                <CardFooter className="gap-2">
                                    <Button as={Link} to={`/exercises/${exercise.id}`} size="sm" variant="flat" className="flex-1">
                                        {t('details', 'Voir détails')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        color={isInTraining(exercise.id) ? "danger" : "primary"}
                                        variant={isInTraining(exercise.id) ? "flat" : "solid"}
                                        onPress={() => isInTraining(exercise.id) ? removeExercise(exercise.id) : addExercise(exercise)}
                                        isIconOnly
                                        className="font-bold text-lg"
                                    >
                                        {isInTraining(exercise.id) ? "-" : "+"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            {selectedExercises.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-divider z-50 animate-slide-in-bottom">
                    <div className="container mx-auto flex justify-between items-center max-w-7xl">
                        <div className="flex flex-col">
                            <p className="font-bold text-large">{selectedExercises.length} {t('exercises.selected', 'exercice(s)')}</p>
                            <p className="text-tiny text-default-500">{selectedExercises.length * 15} min (est.)</p>
                        </div>
                        <Button as={Link} to="/training" color="primary" size="lg" className="font-bold shadow-lg">
                            {t('training.go', "Mon Entraînement")}
                        </Button>
                    </div>
                </div>
            )}
        </DefaultLayout>
    );
}
