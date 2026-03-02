import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Select, SelectItem } from "@heroui/select";
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Category } from '@/types/exercise.types';
import { Level, PitchType } from '@/types/match.types';
import { useUser } from '@/hooks/use-user';
import { addToast } from "@heroui/toast";
import { useSWRConfig } from 'swr';
import { useMatches } from '@/hooks/use-matches';

interface TournamentFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

const PITCH_TYPES: PitchType[] = ['Herbe', 'Synthétique', 'Hybride', 'Stabilisé', 'Indoor'];

export default function TournamentForm({ onSuccess, onCancel }: TournamentFormProps) {
    const { t } = useTranslation();
    const { createMatch } = useMatches();
    const { user, unlinkClub } = useUser();
    const { mutate } = useSWRConfig();
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: '',
        category: Category.SENIORS,
        level: Level.DEPARTEMENTAL_1,
        format: '11v11' as any,
        venue: 'Domicile' as any,
        max_teams: '16',
        registration_fee: '0',
        match_date: new Date().toISOString().split('T')[0],
        match_time: '09:00',
        match_end_time: '11:00',
        email: '',
        phone: '',
        notes: '',
        pitch_type: 'Herbe' as PitchType,
        location_address: '',
        location_zip: '',
        location_city: ''
    });

    const [gender, setGender] = useState<string>('Masculin');

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                email: user.email || prev.email || '',
                phone: user.phone || prev.phone || '',
                location_address: user.club?.address || '',
                location_zip: user.club?.zip || '',
                location_city: user.club?.city || '',
                category: user.category as Category || prev.category,
                level: user.level as Level || prev.level,
                pitch_type: user.pitch_type as PitchType || prev.pitch_type
            }));
        }
    }, [user]);

    const handleChange = (field: string, value: any) => {
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name) newErrors.name = "Le nom du tournoi est obligatoire.";
        if (!formData.category) newErrors.category = "La catégorie est obligatoire.";
        if (!formData.level) newErrors.level = "Le niveau est obligatoire.";
        if (!formData.max_teams) newErrors.max_teams = "Le nombre d'équipes est obligatoire.";
        if (!formData.match_date) newErrors.match_date = "La date est obligatoire.";
        if (!formData.match_time) newErrors.match_time = "L'heure de début est obligatoire.";
        if (!formData.match_end_time) newErrors.match_end_time = "L'heure de fin est obligatoire.";
        if (!formData.pitch_type) newErrors.pitch_type = "Le type de terrain est obligatoire.";
        if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Un email valide est obligatoire.";
        if (!formData.phone || formData.phone.replace(/\D/g, '').length < 11) newErrors.phone = "Le téléphone est obligatoire (au moins 11 chiffres).";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            addToast({ title: "Formulaire incomplet", description: "Veuillez remplir tous les champs obligatoires en rouge.", variant: 'flat', color: 'danger' });
            return;
        }

        if (!user?.club_id) {
            addToast({ title: t('warning'), description: t('tournamentForm.alerts.must_link'), variant: 'flat', color: 'warning' });
            return;
        }

        // SECURITY: Date Validation
        const now = new Date();
        const selectedDate = new Date(formData.match_date!);
        const [hours, minutes] = (formData.match_time || '00:00').split(':').map(Number);
        selectedDate.setHours(hours, minutes);

        if (selectedDate < now) {
            addToast({ title: t('error'), description: t('matchForm.alerts.date_past'), variant: 'flat', color: 'danger' });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                type: 'tournament' as const,
                club_id: user.club_id,
                max_teams: parseInt(formData.max_teams),
                registration_fee: parseFloat(formData.registration_fee)
            };

            await createMatch(payload as any);

            // Global mutation to refresh lists - be very aggressive with matching
            await mutate(key => typeof key === 'string' && key.includes('/api/matches'), undefined, { revalidate: true });
            await mutate(key => typeof key === 'string' && key.includes('/api/tournaments'), undefined, { revalidate: true });

            // Specifically target the dashboard's common key pattern
            await mutate('/api/matches?ownerId=me&include_past=true', undefined, { revalidate: true });

            addToast({ title: t('success', 'Succès'), description: t('tournamentForm.alerts.create_success'), variant: 'flat', color: 'success' });
            if (onSuccess) onSuccess();
        } catch (error: any) {
            const rawMessage = error.message || "";
            let cleanMessage = rawMessage;
            try {
                if (rawMessage.startsWith('{')) {
                    const parsed = JSON.parse(rawMessage);
                    cleanMessage = parsed.error || parsed.message || rawMessage;
                }
            } catch { /* ignore */ }

            const errorMessage = cleanMessage === 'TOO_LATE_TO_MODIFY'
                ? t('error.too_late_to_modify')
                : (cleanMessage || t('error.save_failed'));

            addToast({
                title: t('error.title'),
                description: errorMessage,
                variant: 'flat',
                color: 'danger'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const calculateProgress = () => {
        const fields = [
            formData.name,
            formData.category,
            formData.level,
            formData.max_teams,
            formData.match_date,
            formData.match_time,
            formData.match_end_time,
            gender,
            formData.email,
            formData.phone,
            user?.club_id
        ];
        const filled = fields.filter(f => f && f !== '').length;
        return Math.round((filled / fields.length) * 100);
    };

    const progress = calculateProgress();

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-appearance-in">
            <Card className="shadow-medium border-purple-300/40 bg-purple-300/10">
                <CardHeader className="flex gap-3 bg-linear-to-r from-purple-300/20 to-transparent px-6 py-4">
                    <div className="p-2 bg-purple-300/30 rounded-lg text-purple-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" />
                            <path d="m3.265 10.602 7.641 4.114a.75.75 0 0 0 .712 0l7.641-4.114.679.365a.75.75 0 0 1 0 1.32l-8.32 4.48a.75.75 0 0 1-.712 0l-8.32-4.48a.75.75 0 0 1 0-1.32l.679-.365Z" />
                            <path d="m3.265 14.534 7.641 4.115a.75.75 0 0 0 .712 0l7.641-4.115.679.365a.75.75 0 0 1 0 1.32l-8.32 4.48a.75.75 0 0 1-.712 0l-8.32-4.48a.75.75 0 0 1 0-1.32l.679-.365Z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-md font-bold text-purple-300">{t('tournamentForm.title')}</p>
                        <p className="text-small text-default-500">{t('tournamentForm.subtitle')}</p>
                    </div>
                </CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
                    {/* Row 1: SIRET (Left) and Address Details (Right) */}
                    <div className="md:col-span-2">
                        {!user?.club_id ? (
                            <div className="p-5 bg-purple-300/20 border-2 border-purple-400/50 rounded-2xl flex flex-col gap-4 shadow-sm h-full">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-purple-300/40 rounded-full text-purple-500 shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h4 className="text-sm font-black text-purple-100 uppercase tracking-tighter">
                                            {t('matchForm.link_club.title')}
                                        </h4>
                                        <p className="text-[11px] text-purple-200 font-bold leading-tight">
                                            Veuillez renseigner votre SIRET dans votre profil pour publier.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <Button
                                        size="sm"
                                        className="bg-purple-300 text-purple-950 w-full font-black px-8 shadow-md h-9 uppercase tracking-tighter"
                                        onPress={() => {
                                            addToast({
                                                title: "Action requise",
                                                description: "Cliquez sur l'icône de votre profil dans la barre de navigation pour renseigner votre SIRET.",
                                                color: "warning"
                                            });
                                        }}
                                    >
                                        Aller au profil
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 bg-success-50 border-2 border-success-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm h-full">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-success-100 rounded-full text-success-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" /></svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-success-900 font-black uppercase tracking-tighter text-[10px]">{t('matchForm.link_club.linked')}</span>
                                        <span className="text-success-700 font-bold text-xl">{user.club?.name}</span>
                                    </div>
                                </div>
                                {user?.email === 'yannidelattrebalcer.artois@gmail.com' && (
                                    <Button size="sm" color="danger" variant="flat" onPress={async () => {
                                        if (confirm("Détacher le club ? (Admin uniquement)")) {
                                            try {
                                                await unlinkClub();
                                                addToast({ title: "Club détaché", color: "success" });
                                            } catch (e: any) {
                                                addToast({ title: e.message, color: "danger" });
                                            }
                                        }
                                    }}>{t('matchForm.buttons.unlink', 'Détacher (Admin)')}</Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-3 justify-center">
                        <Input
                            label={t('matchForm.labels.address')}
                            placeholder={t('matchForm.labels.auto_siret')}
                            value={formData.location_address}
                            isDisabled
                            classNames={{
                                inputWrapper: "bg-default-100! text-default-500",
                                label: "text-default-500 font-bold"
                            }}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label={t('matchForm.labels.zip')}
                                placeholder={t('matchForm.labels.auto')}
                                value={formData.location_zip}
                                isDisabled
                                classNames={{
                                    inputWrapper: "bg-default-100! text-default-500",
                                    label: "text-default-500 font-bold"
                                }}
                            />
                            <Input
                                label={t('matchForm.labels.city')}
                                placeholder={t('matchForm.labels.auto')}
                                value={formData.location_city}
                                isDisabled
                                classNames={{
                                    inputWrapper: "bg-default-100! text-default-500",
                                    label: "text-default-500 font-bold"
                                }}
                            />
                        </div>
                        <p className="text-[10px] text-default-400 italic leading-tight px-1 mt-1">
                            {t('matchForm.labels.stadium_note', "Si l'adresse de votre siège social (liée au SIRET) diffère du lieu de la rencontre, veuillez préciser l'adresse exacte du stade dans les notes de l'événement.")}
                        </p>
                    </div>

                    <div className="md:col-span-2 space-y-1">
                        <Input
                            label={t('tournamentForm.labels.name')}
                            placeholder={t('tournamentForm.labels.name_placeholder')}
                            value={formData.name}
                            onValueChange={(v) => handleChange('name', v)}
                            isRequired
                            isInvalid={!!errors.name}
                        />
                        {errors.name && <p className="text-[10px] text-danger font-bold pl-1">{errors.name}</p>}
                    </div>
                    <div className="space-y-1">
                        <Select
                            label={t('matchForm.labels.category')}
                            selectedKeys={[formData.category]}
                            onChange={(e) => handleChange('category', e.target.value)}
                            isRequired
                            isInvalid={!!errors.category}
                        >
                            {Object.values(Category).map((cat) => (
                                <SelectItem key={cat}>{t(`enums.category.${cat}`)}</SelectItem>
                            ))}
                        </Select>
                        {errors.category && <p className="text-[10px] text-danger font-bold pl-1">{errors.category}</p>}
                    </div>
                    <div className="space-y-1">
                        <Select
                            label={t('matchForm.labels.level')}
                            selectedKeys={[formData.level]}
                            onChange={(e) => handleChange('level', e.target.value)}
                            isRequired
                            isInvalid={!!errors.level}
                        >
                            {Object.values(Level).map((cat) => (
                                <SelectItem key={cat}>{t(`enums.level.${cat}`)}</SelectItem>
                            ))}
                        </Select>
                        {errors.level && <p className="text-[10px] text-danger font-bold pl-1">{errors.level}</p>}
                    </div>

                    <div className="space-y-1">
                        <Input
                            type="number"
                            label={t('tournamentForm.labels.max_teams')}
                            value={formData.max_teams}
                            onValueChange={(v) => handleChange('max_teams', v)}
                            isRequired
                            isInvalid={!!errors.max_teams}
                        />
                        {errors.max_teams && <p className="text-[10px] text-danger font-bold pl-1">{errors.max_teams}</p>}
                    </div>
                    <Input
                        type="number"
                        label={t('tournamentForm.labels.fee')}
                        value={formData.registration_fee}
                        onValueChange={(v) => handleChange('registration_fee', v)}
                        placeholder={t('tournamentForm.labels.fee_placeholder')}
                    />
                    <Select
                        label={t('matchForm.labels.gender')}
                        selectedKeys={[gender]}
                        onChange={(e) => setGender(e.target.value)}
                    >
                        <SelectItem key="Masculin">{t('enums.gender.Masculin')}</SelectItem>
                        <SelectItem key="Féminin">{t('enums.gender.Féminin')}</SelectItem>
                        <SelectItem key="Mixte">{t('enums.gender.Mixte')}</SelectItem>
                        <SelectItem key="Non spécifié">{t('enums.gender.Non spécifié')}</SelectItem>
                    </Select>
                    <div className="space-y-1">
                        <Select
                            label={t('matchForm.labels.pitch_type')}
                            selectedKeys={[formData.pitch_type]}
                            onChange={(e) => handleChange('pitch_type', e.target.value)}
                            isRequired
                            isInvalid={!!errors.pitch_type}
                        >
                            {PITCH_TYPES.map((type) => (
                                <SelectItem key={type}>{t(`enums.pitch.${type}`)}</SelectItem>
                            ))}
                        </Select>
                        {errors.pitch_type && <p className="text-[10px] text-danger font-bold pl-1">{errors.pitch_type}</p>}
                    </div>

                    {/* Date and Times section */}
                    <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <Input
                                type="date"
                                label={t('tournamentForm.labels.date')}
                                value={formData.match_date}
                                onValueChange={(v) => handleChange('match_date', v)}
                                min={new Date().toISOString().split('T')[0]}
                                isRequired
                                isInvalid={!!errors.match_date}
                            />
                            {errors.match_date && <p className="text-[10px] text-danger font-bold pl-1">{errors.match_date}</p>}
                        </div>
                        <div className="space-y-1">
                            <Input
                                type="time"
                                label={t('tournamentForm.labels.time')}
                                value={formData.match_time}
                                onValueChange={(v) => handleChange('match_time', v)}
                                isRequired
                                isInvalid={!!errors.match_time}
                            />
                            {errors.match_time && <p className="text-[10px] text-danger font-bold pl-1">{errors.match_time}</p>}
                        </div>
                        <div className="space-y-1">
                            <Input
                                type="time"
                                label={t('tournamentForm.labels.end_time')}
                                value={formData.match_end_time}
                                onValueChange={(v) => handleChange('match_end_time', v)}
                                isRequired
                                isInvalid={!!errors.match_end_time}
                            />
                            {errors.match_end_time && <p className="text-[10px] text-danger font-bold pl-1">{errors.match_end_time}</p>}
                        </div>
                        <div className="hidden md:block"></div>
                    </div>

                    {/* Row 4: Removed since it moved to Row 1 */}

                    {/* Row 5: Centered Progress Bar */}
                    <div className="md:col-span-4 flex flex-col justify-center space-y-3 mt-4">
                        <div className="w-full md:w-[64%] mx-auto flex flex-col space-y-3">
                            <p className="text-sm font-bold text-purple-300 uppercase tracking-tight text-center">
                                {t('tournamentForm.progress')}: {progress}%
                            </p>
                            <div className="w-full h-4 bg-purple-400/20 rounded-full overflow-hidden p-px border border-purple-300/40 ring-1 ring-purple-300/20 shadow-inner">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(216,180,254,0.3)]"
                                    style={{
                                        width: `${progress}%`,
                                        background: 'linear-gradient(90deg, #c084fc 0%, #d8b4fe 50%, #f3e8ff 100%)',
                                        backgroundSize: '200% 100%'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader className="font-bold bg-default-50">{t('tournamentForm.contact_title')}</CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Input label={t('tournamentForm.labels.contact_email')} type="email" value={formData.email} onValueChange={(v) => handleChange('email', v)} isRequired isInvalid={!!errors.email} />
                        {errors.email && <p className="text-[10px] text-danger font-bold pl-1">{errors.email}</p>}
                    </div>
                    <div className="space-y-1">
                        <Input label={t('matchForm.labels.phone')} type="tel" value={formData.phone} onValueChange={(v) => handleChange('phone', v)} isRequired isInvalid={!!errors.phone} />
                        {errors.phone && <p className="text-[10px] text-danger font-bold pl-1">{errors.phone}</p>}
                    </div>
                    <Textarea label={t('tournamentForm.labels.notes')} placeholder={t('tournamentForm.labels.notes_placeholder')} value={formData.notes} onValueChange={(v) => handleChange('notes', v)} className="md:col-span-2" />
                </CardBody>
            </Card>

            <div className="flex justify-end gap-2 mt-4">
                {onCancel && <Button variant="light" onClick={onCancel}>{t('matchForm.buttons.cancel')}</Button>}
                <Button type="submit" className="bg-purple-300 font-bold text-purple-950" isLoading={isSaving} isDisabled={!user?.club_id}>
                    {t('tournamentForm.labels.publish')}
                </Button>
            </div>
        </form>
    );
}
