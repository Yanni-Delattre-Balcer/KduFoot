
import { useTranslation } from 'react-i18next';
import DefaultLayout from '../../layouts/default';
import { useExercises } from '../../hooks/use-exercises';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image } from "@heroui/image";
import { Chip } from "@heroui/chip";
import { useTraining } from '../../contexts/training-context';
import FootballClock from '../../components/football-clock';

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
        <DefaultLayout maxWidth="max-w-full">
            <section className="flex flex-col gap-10 w-full px-4">

                {/* Hero - Analyse ta vidéo */}
                <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-amber-600/15 via-yellow-500/10 to-orange-500/10 border border-amber-500/20">
                    {/* Grass stripes - standard green */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(245,158,11,0.3) 40px, rgba(245,158,11,0.3) 80px)' }}></div>
                    {/* Field center line + circle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-b from-transparent via-white/5 to-transparent"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5"></div>

                    {/* Football clock - top right */}
                    <div className="hidden md:block absolute top-4 right-4 z-10">
                        <FootballClock size={140} />
                    </div>

                    <div className="relative flex flex-col items-center gap-6 py-14 px-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-[linear-gradient(to_bottom_right,#f59e0b,#fbbf24)] shadow-lg shadow-amber-500/20 text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-amber-500 to-yellow-500">
                                {t('video.analyzeTitle')}
                            </h1>
                        </div>
                        <p className="text-default-500 text-center max-w-lg font-bold uppercase tracking-widest text-xs opacity-70">
                            {t('video.analyzeSubtitle')}
                        </p>
                        <div className="w-full max-w-4xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                            <Input
                                placeholder={t('video.urlPlaceholder')}
                                value={videoUrl}
                                onValueChange={setVideoUrl}
                                size="lg"
                                classNames={{
                                    inputWrapper: "h-14 px-6 shadow-sm",
                                    input: "text-lg",
                                }}
                                startContent={
                                    <div className="pointer-events-none flex items-center pr-2">
                                        {(() => {
                                            const url = videoUrl.toLowerCase();
                                            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                                                return (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-600">
                                                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                                                    </svg>
                                                );
                                            } else if (url.includes('tiktok.com')) {
                                                return (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black dark:text-white">
                                                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                                                    </svg>
                                                );
                                            } else if (url.includes('instagram.com')) {
                                                return (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-pink-600">
                                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                                    </svg>
                                                );
                                            } else if (url.includes('twitter.com') || url.includes('x.com')) {
                                                return (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-black dark:text-white">
                                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                    </svg>
                                                );
                                            } else {
                                                return (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-default-400">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                                    </svg>
                                                );
                                            }
                                        })()}
                                    </div>
                                }
                            />
                            <Button
                                color="warning"
                                size="lg"
                                className="sm:px-10 font-bold text-lg text-white bg-linear-to-r from-amber-500 to-yellow-500 shadow-xl shadow-amber-500/30 h-14"
                                onPress={handleAnalyze}
                            >
                                {t('video.analyze')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Exercise List */}
                <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-secondary/10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-secondary">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold">{t('myExercises')}</h2>
                        <Chip size="sm" variant="flat" color="warning" className="font-semibold">{exercises.length}</Chip>
                    </div>

                    {isError && (
                        <div className="text-danger p-4 rounded-xl bg-danger/10 border border-danger/20">
                            {t('error.loading_exercises', 'Erreur lors du chargement des exercices')}
                        </div>
                    )}

                    {exercises.length === 0 && !isError && (
                        <Card className="border border-amber-500/20 bg-[#202124]">
                            <CardBody className="py-8 flex flex-col items-center gap-4 text-center">
                                <div className="p-4 rounded-full bg-[linear-gradient(to_bottom_right,#f59e0b,#fbbf24)]/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-amber-500">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                </div>
                                <p className="text-lg text-default-500">
                                    {t('exercises.emptyTitle')}
                                </p>
                                <p className="text-sm text-default-400">
                                    {t('exercises.emptySubtitle')}
                                </p>
                            </CardBody>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exercises.map((exercise) => (
                            <Card key={exercise.id} className="group hover:shadow-lg hover:shadow-amber-500/10 transition-all bg-[#202124] border border-amber-500/20 hover:border-amber-500/40">
                                <CardHeader className="pb-0 pt-4 px-4 flex-col items-start gap-1">
                                    <div className="flex justify-between w-full">
                                        <Chip size="sm" variant="flat" color="warning" className="font-semibold">{t(`enums.category.${exercise.category}`)}</Chip>
                                    </div>
                                    <small className="text-default-400">{exercise.themes}</small>
                                    <h4 className="font-bold text-large group-hover:text-amber-500 transition-colors">{exercise.title}</h4>
                                </CardHeader>
                                <CardBody className="overflow-visible py-3">
                                    <div className="w-full h-40 bg-linear-to-br from-default-50 to-default-100 rounded-xl flex items-center justify-center overflow-hidden">
                                        {exercise.thumbnail_url ? (
                                            <Image
                                                alt="Card background"
                                                className="object-cover rounded-xl w-full h-full"
                                                src={exercise.thumbnail_url}
                                                width={270}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-default-200">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                                                </svg>
                                                <span className="text-default-300 text-xs">{t('exercises.noImage')}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-3 text-sm text-default-600 line-clamp-3">
                                        {exercise.synopsis}
                                    </p>
                                </CardBody>
                                <CardFooter className="gap-2 px-4 pb-4">
                                    <Button as={Link} to={`/exercises/${exercise.id}`} size="sm" variant="flat" className="flex-1">
                                        {t('details', 'Voir détails')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        color={isInTraining(exercise.id) ? "danger" : "warning"}
                                        variant={isInTraining(exercise.id) ? "flat" : "solid"}
                                        onPress={() => isInTraining(exercise.id) ? removeExercise(exercise.id) : addExercise(exercise)}
                                        isIconOnly
                                        className="font-bold text-lg shadow-sm text-white"
                                    >
                                        {isInTraining(exercise.id) ? "−" : "+"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Training bar */}
            {selectedExercises.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-amber-500/20 z-50 shadow-lg shadow-amber-500/5">
                    <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center max-w-7xl gap-4">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="p-2 rounded-xl bg-amber-500/10 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-amber-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <p className="font-bold text-base sm:text-large">{selectedExercises.length} {t('exercises.selected', 'exercice(s)')}</p>
                                <p className="text-tiny text-default-500">{selectedExercises.length * 15} min (est.)</p>
                            </div>
                        </div>
                        <Button as={Link} to="/training" color="warning" size="lg" className="font-bold shadow-lg shadow-amber-500/30 w-full sm:w-auto text-white">
                            {t('training.go')}
                        </Button>
                    </div>
                </div>
            )}
        </DefaultLayout>
    );
}
