import DefaultLayout from '@/layouts/default';
import { useTranslation } from 'react-i18next';
import { useTraining } from '@/contexts/training-context';
import { Button } from '@heroui/button';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import FootballClock from '@/components/football-clock';

export default function TrainingPage() {
    const { t } = useTranslation();
    const { selectedExercises, removeExercise } = useTraining();

    return (
        <DefaultLayout maxWidth="max-w-full">
            <div className="flex flex-col gap-8 w-full px-4">

                {/* Hero - Mon Entraînement */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600/15 via-emerald-500/10 to-teal-500/10 border border-[#17c964]/20">
                    {/* Grass stripes - standard green */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34,197,94,0.3) 40px, rgba(34,197,94,0.3) 80px)' }}></div>
                    {/* Field center line + circle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5"></div>

                    {/* Football clock - top right */}
                    <div className="hidden md:block absolute top-4 right-4 z-10">
                        <FootballClock size={140} showSeconds={false} />
                    </div>

                    <div className="relative flex flex-col items-center gap-6 py-14 px-6 text-center">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-[#17c964]/10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#17c964]">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#17c964] to-[#12a150]">
                                {t('nav.training', 'Mon Entraînement')}
                            </h1>
                        </div>
                        {selectedExercises.length > 0 && (
                            <p className="text-default-500 text-lg max-w-lg">
                                {selectedExercises.length} exercice{selectedExercises.length > 1 ? 's' : ''} sélectionné{selectedExercises.length > 1 ? 's' : ''} · Durée estimée : ~{selectedExercises.length * 15} min
                            </p>
                        )}
                        {selectedExercises.length === 0 && (
                            <p className="text-default-500 text-lg max-w-lg">
                                Créez votre séance d'entraînement personnalisée en ajoutant des exercices depuis la bibliothèque.
                            </p>
                        )}
                    </div>
                </div>

                {selectedExercises.length === 0 ? (
                    <Card className="border border-green-500/20 bg-[#202221] overflow-hidden">
                        <CardBody className="relative py-16 flex flex-col items-center gap-5 text-center">
                            <div className="p-5 rounded-full bg-green-500/10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-14 h-14 text-[#17c964]">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xl font-semibold text-default-700">
                                    {t('training.empty', "Pas d'entraînement en cours")}
                                </p>
                                <p className="text-default-400 mt-2 max-w-md">
                                    Sélectionnez des exercices depuis la bibliothèque pour construire votre séance d'entraînement.
                                </p>
                            </div>
                            <Button
                                as={Link}
                                to="/exercises"
                                color="success"
                                variant="shadow"
                                size="lg"
                                className="font-bold mt-2"
                                startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                }
                            >
                                {t('training.go_exercises', 'Découvrir les exercices')}
                            </Button>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-4">
                        {selectedExercises.map((exercise, index) => (
                            <Card key={exercise.id} className="group hover:shadow-lg hover:shadow-green-500/10 transition-all bg-[#202221] border border-green-500/20 hover:border-green-500/40">
                                <CardHeader className="flex flex-row items-center gap-4 p-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#17c964]/20 to-[#12a150]/20 flex items-center justify-center">
                                        <span className="font-bold text-[#17c964]">{index + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-lg truncate">{exercise.title}</h4>
                                        <div className="flex gap-2 mt-1">
                                            <Chip size="sm" variant="flat" color="primary">{exercise.category}</Chip>
                                            {exercise.themes && <Chip size="sm" variant="flat" color="secondary">{exercise.themes}</Chip>}
                                        </div>
                                    </div>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="flat"
                                        color="danger"
                                        onPress={() => removeExercise(exercise.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                    </Button>
                                </CardHeader>
                            </Card>
                        ))}

                        <div className="flex justify-between items-center mt-4 p-4 rounded-2xl bg-[#202221] border border-green-500/20">
                            <div>
                                <p className="font-bold text-lg">{selectedExercises.length} exercice{selectedExercises.length > 1 ? 's' : ''}</p>
                                <p className="text-sm text-default-500">Durée estimée : ~{selectedExercises.length * 15} min</p>
                            </div>
                            <Button as={Link} to="/exercises" variant="flat" color="primary" size="sm">
                                + Ajouter des exercices
                            </Button>
                        </div>
                    </div>
                )
                }
            </div >
        </DefaultLayout >
    );
}
