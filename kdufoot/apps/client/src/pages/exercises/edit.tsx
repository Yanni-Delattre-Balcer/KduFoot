
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useExercise, useExercises } from '@/hooks/use-exercises';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Select, SelectItem } from "@heroui/select";
import { useEffect, useState } from 'react';
import { Theme, Category, Level, CreateExerciseDto } from '@/types/exercise.types';
import { Card, CardBody, CardHeader } from '@heroui/card';

export default function ExerciseEditPage() {
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { exercise, isLoading: isLoadingExercise } = useExercise(id || null);
    const { createExercise, updateExercise } = useExercises();

    const [formData, setFormData] = useState<Partial<CreateExerciseDto>>({
        title: '',
        synopsis: '',
        themes: [],
        category: Category.SENIORS,
        level: Level.REGIONAL,
        nb_joueurs: '',
        dimensions: '',
        materiel: '',
        duration: '',
        svg_schema: '',
        thumbnail_url: '',
        video_url: ''
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (exercise && isEditing) {
            setFormData({
                title: exercise.title,
                synopsis: exercise.synopsis,
                themes: Array.isArray(exercise.themes) ? exercise.themes : [exercise.themes as any],
                category: exercise.category,
                level: exercise.level,
                nb_joueurs: exercise.nb_joueurs,
                dimensions: exercise.dimensions,
                materiel: exercise.materiel,
                duration: exercise.duration,
                svg_schema: exercise.svg_schema,
                thumbnail_url: exercise.thumbnail_url,
                video_url: exercise.video_url
            });
        }
    }, [exercise, isEditing]);

    const handleChange = (field: keyof CreateExerciseDto, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (isEditing && id) {
                await updateExercise(id, formData as any); // Type assertion for now due to partial
            } else {
                await createExercise(formData as any);
            }
            navigate('/exercises');
        } catch (error) {
            console.error("Failed to save exercise", error);
            alert(t('error.save_failed', 'Erreur lors de la sauvegarde'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditing && isLoadingExercise) {
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
                    {isEditing ? t('exercise.edit_title', 'Modifier l\'exercice') : t('exercise.create_title', 'Créer un exercice')}
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <Card>
                        <CardHeader className="font-bold bg-default-50">Informations Grénérales</CardHeader>
                        <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label={t('exercise.title_label', 'Titre de l\'exercice')}
                                placeholder="Ex: Conservation 5 contre 5"
                                value={formData.title}
                                onValueChange={(v) => handleChange('title', v)}
                                isRequired
                                className="md:col-span-2"
                            />
                            <Select
                                label="Catégorie"
                                placeholder="Choisir une catégorie"
                                selectedKeys={formData.category ? [formData.category] : []}
                                onChange={(e) => handleChange('category', e.target.value)}
                                isRequired
                            >
                                {Object.values(Category).map((cat) => (
                                    <SelectItem key={cat}>{cat}</SelectItem>
                                ))}
                            </Select>
                            <Select
                                label="Niveau"
                                placeholder="Choisir un niveau"
                                selectedKeys={formData.level ? [formData.level] : []}
                                onChange={(e) => handleChange('level', e.target.value)}
                                isRequired
                            >
                                {Object.values(Level).map((lvl) => (
                                    <SelectItem key={lvl}>{lvl}</SelectItem>
                                ))}
                            </Select>
                            <Select
                                label="Thèmes"
                                placeholder="Choisir des thèmes"
                                selectionMode="multiple"
                                selectedKeys={new Set(formData.themes || [])}
                                onSelectionChange={(keys) => handleChange('themes', Array.from(keys))}
                                isRequired
                            >
                                {Object.values(Theme).map((thm) => (
                                    <SelectItem key={thm}>{thm}</SelectItem>
                                ))}
                            </Select>
                            <Input
                                label="Durée (min)"
                                type="number"
                                value={formData.duration}
                                onValueChange={(v) => handleChange('duration', v)}
                                isRequired
                            />
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader className="font-bold bg-default-50">Détails Techniques</CardHeader>
                        <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nombre de joueurs"
                                value={formData.nb_joueurs}
                                onValueChange={(v) => handleChange('nb_joueurs', v)}
                                placeholder="Ex: 10 + 2 gardiens"
                            />
                            <Input
                                label="Dimensions"
                                value={formData.dimensions}
                                onValueChange={(v) => handleChange('dimensions', v)}
                                placeholder="Ex: 40x30m"
                            />
                            <Input
                                label="Matériel"
                                value={formData.materiel}
                                onValueChange={(v) => handleChange('materiel', v)}
                                placeholder="Ex: Ballons, chasubles, coupelles"
                                className="md:col-span-2"
                            />
                            <Textarea
                                label="Synopsis / Description"
                                placeholder="Décrivez le déroulement de l'exercice..."
                                value={formData.synopsis}
                                onValueChange={(v) => handleChange('synopsis', v)}
                                minRows={5}
                                className="md:col-span-2"
                                isRequired
                            />
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader className="font-bold bg-default-50">Média & Schéma</CardHeader>
                        <CardBody className="grid grid-cols-1 gap-4">
                            <Input
                                label="URL de l'image (Thumbnail)"
                                value={formData.thumbnail_url}
                                onValueChange={(v) => handleChange('thumbnail_url', v)}
                                placeholder="https://..."
                            />
                            <Input
                                label="URL Vidéo (Optionnel)"
                                value={formData.video_url}
                                onValueChange={(v) => handleChange('video_url', v)}
                                placeholder="https://youtube.com/..."
                            />
                            <Textarea
                                label="Code SVG du schéma (Optionnel)"
                                placeholder="<svg>...</svg>"
                                value={formData.svg_schema}
                                onValueChange={(v) => handleChange('svg_schema', v)}
                                minRows={3}
                            />
                        </CardBody>
                    </Card>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="light" onClick={() => navigate('/exercises')}>
                            Annuler
                        </Button>
                        <Button type="submit" color="primary" isLoading={isSaving}>
                            {isEditing ? 'Mettre à jour' : 'Créer l\'exercice'}
                        </Button>
                    </div>
                </form>
            </div>
        </DefaultLayout>
    );
}
