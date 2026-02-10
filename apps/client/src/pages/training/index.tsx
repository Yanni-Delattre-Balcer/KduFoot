import DefaultLayout from '@/layouts/default';
import { useTranslation } from 'react-i18next';
import { useTraining } from '@/contexts/training-context';
import { Button } from '@heroui/button';
import { Link } from 'react-router-dom';
import { Card, CardBody } from '@heroui/card';

export default function TrainingPage() {
    const { t } = useTranslation();
    const { selectedExercises } = useTraining();

    return (
        <DefaultLayout>
            <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
                <h1 className="text-2xl font-bold">{t('nav.training', 'Mon Entraînement')}</h1>

                {selectedExercises.length === 0 ? (
                    <Card>
                        <CardBody className="py-12 flex flex-col items-center gap-4 text-center">
                            <p className="text-lg text-default-500">
                                {t('training.empty', "Vous n'avez pas d'entraînement en cours.")}
                            </p>
                            <Button as={Link} to="/exercises" color="primary" variant="flat">
                                {t('training.go_exercises', 'Découvrir les exercices')}
                            </Button>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-4">
                        <p>Contenu de l'entraînement ({selectedExercises.length} exercices)</p>
                        {/* Implementation continues... */}
                    </div>
                )}
            </div>
        </DefaultLayout>
    );
}
