import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Select, SelectItem } from "@heroui/select";
import { Card, CardBody, CardHeader } from '@heroui/card';
import { CreateMatchDto, Match } from '@/types/match.types';
import { Category } from '@/types/exercise.types';
import ClubSearch from '@/components/club-search';
import { useMatches } from '@/hooks/use-matches';

interface MatchFormProps {
    initialData?: Match;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function MatchForm({ initialData, onSuccess, onCancel }: MatchFormProps) {
    const { t } = useTranslation();
    const { createMatch, updateMatch } = useMatches();
    const [isSaving, setIsSaving] = useState(false);

    // Initialize form data
    const [formData, setFormData] = useState<Partial<CreateMatchDto>>({
        category: Category.SENIORS,
        format: '11v11',
        venue: 'Domicile',
        match_date: new Date().toISOString().split('T')[0],
        match_time: '15:00',
        email: '',
        phone: '',
        notes: '',
        club_id: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                category: initialData.category,
                format: initialData.format,
                venue: initialData.venue,
                match_date: initialData.match_date,
                match_time: initialData.match_time,
                email: initialData.email,
                phone: initialData.phone,
                notes: initialData.notes,
                club_id: initialData.club_id
            });
        }
    }, [initialData]);

    const handleChange = (field: keyof CreateMatchDto, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (initialData?.id) {
                await updateMatch(initialData.id, formData as any);
            } else {
                await createMatch(formData as any);
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to save match", error);
            alert(t('error.save_failed', 'Erreur lors de la sauvegarde'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-appearance-in">
            <Card>
                <CardHeader className="font-bold bg-default-50">Informations du Match</CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        label="Format"
                        placeholder="Choisir un format"
                        selectedKeys={formData.format ? [formData.format] : []}
                        onChange={(e) => handleChange('format', e.target.value)}
                        isRequired
                    >
                        <SelectItem key="11v11">11 vs 11</SelectItem>
                        <SelectItem key="8v8">8 vs 8</SelectItem>
                        <SelectItem key="5v5">5 vs 5</SelectItem>
                        <SelectItem key="Futsal">Futsal</SelectItem>
                    </Select>

                    <Input
                        type="date"
                        label="Date du match"
                        value={formData.match_date}
                        onValueChange={(v) => handleChange('match_date', v)}
                        isRequired
                    />
                    <Input
                        type="time"
                        label="Heure du match"
                        value={formData.match_time}
                        onValueChange={(v) => handleChange('match_time', v)}
                        isRequired
                    />

                    <Select
                        label="Lieu"
                        placeholder="Choisir un lieu"
                        selectedKeys={formData.venue ? [formData.venue] : []}
                        onChange={(e) => handleChange('venue', e.target.value)}
                        isRequired
                    >
                        <SelectItem key="Domicile">Domicile</SelectItem>
                        <SelectItem key="Extérieur">Extérieur</SelectItem>
                        <SelectItem key="Neutre">Terrain Neutre</SelectItem>
                    </Select>

                    <ClubSearch
                        onSelect={(club) => handleChange('club_id', club?.id || '')}
                        initialInputValue={initialData?.club?.name || ''}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader className="font-bold bg-default-50">Contact & Notes</CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Email de contact"
                        type="email"
                        value={formData.email}
                        onValueChange={(v) => handleChange('email', v)}
                        isRequired
                    />
                    <Input
                        label="Téléphone"
                        type="tel"
                        value={formData.phone}
                        onValueChange={(v) => handleChange('phone', v)}
                        isRequired
                    />
                    <Textarea
                        label="Notes / Instructions"
                        placeholder="Informations complémentaires..."
                        value={formData.notes}
                        onValueChange={(v) => handleChange('notes', v)}
                        minRows={3}
                        className="md:col-span-2"
                    />
                </CardBody>
            </Card>

            <div className="flex justify-end gap-2 mt-4">
                {onCancel && (
                    <Button type="button" variant="light" onClick={onCancel}>
                        Annuler
                    </Button>
                )}
                <Button type="submit" color="primary" isLoading={isSaving}>
                    {initialData ? 'Mettre à jour' : 'Créer le match'}
                </Button>
            </div>
        </form>
    );
}
