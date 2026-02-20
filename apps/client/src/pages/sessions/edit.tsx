
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useSession, useSessions } from '@/hooks/use-sessions';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from "@heroui/select";
import { useEffect, useState } from 'react';
import { CreateSessionDto } from '@/types/session.types';
import { Category, Level } from '@/types/exercise.types';
import { Card, CardBody, CardHeader } from '@heroui/card';
import ExerciseSelector from '@/components/exercise-selector';
import { SessionExercise } from '@/types/session.types';
import { Chip } from "@heroui/chip";

export default function SessionEditPage() {
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { session, isLoading: isLoadingSession } = useSession(id || null);
    const { createSession, updateSession } = useSessions();

    const [formData, setFormData] = useState<Partial<CreateSessionDto>>({
        name: '',
        category: Category.SENIORS,
        level: Level.REGIONAL,
        total_duration: 90,
        status: 'draft',
        scheduled_date: new Date().toISOString().split('T')[0],
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);
    const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

    useEffect(() => {
        if (session && isEditing) {
            setFormData({
                name: session.name,
                category: session.category,
                level: session.level,
                total_duration: session.total_duration,
                status: session.status,
                scheduled_date: session.scheduled_date ? session.scheduled_date.split('T')[0] : '',
            });
            // Initialize exercises
            if (session.exercises) {
                setSessionExercises([...session.exercises].sort((a, b) => a.order_index - b.order_index));
            }
        }
    }, [session, isEditing]);

    const handleAddExercises = (newExercises: any[]) => { // Using any[] temporarily, should be Exercise[]
        setSessionExercises(prev => {
            const currentCount = prev.length;
            const newSessionExercises = newExercises.map((ex, index) => ({
                exercise_id: ex.id,
                exercise: ex,
                order_index: currentCount + index,
                duration: parseInt(ex.duration) || 10,
                players: parseInt(ex.nb_joueurs) || 12, // Default to sensible value or parse ex.nb_joueurs if it's string number
            } as SessionExercise));
            return [...prev, ...newSessionExercises];
        });
    };

    const handleRemoveExercise = (indexToRemove: number) => {
        setSessionExercises(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleUpdateExerciseDuration = (index: number, duration: number) => {
        setSessionExercises(prev => {
            const newExercises = [...prev];
            newExercises[index] = { ...newExercises[index], duration };
            return newExercises;
        });
    };

    const handleChange = (field: keyof CreateSessionDto, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                exercises: sessionExercises.map((se, idx) => ({
                    exercise_id: se.exercise_id,
                    order_index: idx, // Re-index to ensure order
                    duration: se.duration,
                    players: se.players,
                    adapted_data: se.adapted_data
                }))
            };

            if (isEditing && id) {
                await updateSession(id, payload as any);
            } else {
                await createSession(payload as any);
            }
            navigate('/sessions');
        } catch (error) {
            console.error("Failed to save session", error);
            alert(t('error.save_failed', 'Erreur lors de la sauvegarde'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditing && isLoadingSession) {
        return (
            <DefaultLayout>
                <div className="flex justify-center items-center h-[50vh]">
                    <Spinner label={t('loading', 'Chargement...')} />
                </div>
            </DefaultLayout>
        );
    }

    return (
        <DefaultLayout>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">
                    {isEditing ? t('session.edit_title', 'Modifier la séance') : t('session.create_title', 'Planifier une séance')}
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <Card>
                        <CardHeader className="font-bold bg-default-50">{t('session.info_general', 'Informations Générales')}</CardHeader>
                        <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label={t('session.name_label', 'Nom de la séance')}
                                placeholder={t('session.name_placeholder', 'Ex: Séance Technico-Tactique')}
                                value={formData.name}
                                onValueChange={(v) => handleChange('name', v)}
                                isRequired
                                className="md:col-span-2"
                            />
                            <Select
                                label={t('session.category_label', 'Catégorie')}
                                placeholder={t('session.choose_category', 'Choisir une catégorie')}
                                selectedKeys={formData.category ? [formData.category] : []}
                                onChange={(e) => handleChange('category', e.target.value)}
                                isRequired
                            >
                                {Object.values(Category).map((cat) => (
                                    <SelectItem key={cat}>{t(`enums.category.${cat}`)}</SelectItem>
                                ))}
                            </Select>
                            <Select
                                label={t('session.level_label', 'Niveau')}
                                placeholder={t('session.choose_level', 'Choisir un niveau')}
                                selectedKeys={formData.level ? [formData.level] : []}
                                onChange={(e) => handleChange('level', e.target.value)}
                                isRequired
                            >
                                {Object.values(Level).map((lvl) => (
                                    <SelectItem key={lvl}>{t(`enums.level.${lvl}`)}</SelectItem>
                                ))}
                            </Select>

                            <Input
                                type="date"
                                label={t('session.date_label', 'Date prévue')}
                                value={formData.scheduled_date}
                                onValueChange={(v) => handleChange('scheduled_date', v)}
                            />
                            <Input
                                type="number"
                                label={t('session.duration_label', 'Durée totale (min)')}
                                value={formData.total_duration?.toString()}
                                onValueChange={(v) => handleChange('total_duration', parseInt(v))}
                                isRequired
                            />
                            <Select
                                label={t('status', 'Statut')}
                                selectedKeys={formData.status ? [formData.status] : []}
                                onChange={(e) => handleChange('status', e.target.value)}
                                isRequired
                            >
                                <SelectItem key="draft">{t('session.status_enum.draft', 'Brouillon')}</SelectItem>
                                <SelectItem key="scheduled">{t('session.status_enum.scheduled', 'Planifiée')}</SelectItem>
                                <SelectItem key="completed">{t('session.status_enum.completed', 'Terminée')}</SelectItem>
                            </Select>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader className="font-bold bg-default-50 flex justify-between">
                            <span>{t('exercises.title', 'Exercices')}</span>
                            <Button size="sm" color="primary" onPress={() => setIsExerciseSelectorOpen(true)}>
                                {t('session.add_exercises', 'Ajouter des exercices')}
                            </Button>
                        </CardHeader>
                        <CardBody className="flex flex-col gap-4">
                            {sessionExercises.length === 0 ? (
                                <p className="text-center text-default-500 py-8">
                                    {t('session.no_exercises', 'Aucun exercice ajouté.')}
                                </p>
                            ) : (
                                sessionExercises.map((se, index) => (
                                    <div key={`${se.exercise_id}-${index}`} className="flex flex-col w-full">
                                        <Card className="w-full border-1 border-default-200 shadow-sm">
                                            <CardBody className="flex flex-row gap-4 p-2 items-center">
                                                <div className="flex bg-default-100 rounded-lg p-2 items-center justify-center min-w-[40px]">
                                                    <span className="font-bold text-lg">{index + 1}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 items-center min-w-[80px]">
                                                    <Input
                                                        type="number"
                                                        size="sm"
                                                        label={t('duration', 'Durée')}
                                                        labelPlacement="outside-left"
                                                        value={se.duration.toString()}
                                                        onValueChange={(v) => handleUpdateExerciseDuration(index, parseInt(v) || 0)}
                                                        endContent={<span className="text-default-400 text-xs">min</span>}
                                                        className="w-28"
                                                    />
                                                </div>
                                                <div className="flex flex-col grow">
                                                    <span className="font-bold">{se.exercise?.title || t('exercise.untitled', 'Exercice')}</span>
                                                    <div className="flex gap-2">
                                                        {se.exercise?.category && <Chip size="sm" variant="flat">{t(`enums.category.${se.exercise.category}`)}</Chip>}
                                                    </div>
                                                </div>
                                                <Button isIconOnly color="danger" variant="light" onPress={() => handleRemoveExercise(index)}>
                                                    ✕
                                                </Button>
                                            </CardBody>
                                        </Card>
                                    </div>
                                ))
                            )}
                        </CardBody>
                    </Card>

                    <ExerciseSelector
                        isOpen={isExerciseSelectorOpen}
                        onClose={() => setIsExerciseSelectorOpen(false)}
                        onSelect={handleAddExercises}
                    />

                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="light" onClick={() => navigate('/sessions')}>
                            {t('cancel', 'Annuler')}
                        </Button>
                        <Button type="submit" color="primary" isLoading={isSaving}>
                            {isEditing ? t('update', 'Mettre à jour') : t('session.create_button', 'Créer la séance')}
                        </Button>
                    </div>
                </form>
            </div>
        </DefaultLayout>
    );
}
