import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Select, SelectItem } from "@heroui/select";
import { Card, CardBody, CardHeader } from '@heroui/card';
import { addToast } from "@heroui/toast";
import { CreateMatchDto, Match, PitchType, Level } from '@/types/match.types';
import { Category } from '@/types/exercise.types';
import { useMatches } from '@/hooks/use-matches';
import { useUser } from '@/hooks/use-user';
import { useAuth0 } from '@auth0/auth0-react';

interface MatchFormProps {
    initialData?: Match;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const PITCH_TYPES: PitchType[] = ['Herbe', 'Synthétique', 'Hybride', 'Stabilisé', 'Indoor'];

export default function MatchForm({ initialData, onSuccess, onCancel }: MatchFormProps) {
    const { t } = useTranslation();
    const { createMatch, updateMatch } = useMatches();
    const { user, isLocked, unlinkClub, updateUser } = useUser();
    const { user: auth0User } = useAuth0();

    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize form data
    const [formData, setFormData] = useState<Partial<CreateMatchDto>>({
        category: Category.SENIORS,
        level: Level.DEPARTEMENTAL_1,
        format: '11v11',
        venue: 'Domicile',
        match_date: new Date().toISOString().split('T')[0],
        match_time: '15:00',
        email: '',
        phone: '',
        notes: '',
        club_id: '',
        location_address: '',
        location_city: '',
        location_zip: '',
        pitch_type: undefined
    });

    // Separate state for Gender (client-side only, appended to notes on submit)
    const [gender, setGender] = useState<string>('Masculin');

    useEffect(() => {
        if (initialData) {
            // Extract Gender from notes if present
            const genderMatch = initialData.notes?.match(/Genre: (.*)(\n|$)/);
            let extractedGender = genderMatch ? genderMatch[1].trim() : 'Masculin';
            // Strip technical prefix from legacy data
            if (extractedGender.startsWith('enums.gender.')) {
                extractedGender = extractedGender.replace('enums.gender.', '');
            }
            const cleanNotes = initialData.notes?.replace(/Genre: .*(\n|$)/, '').trim() || '';

            setGender(extractedGender);
            setFormData({
                category: initialData.category,
                level: initialData.level,
                format: initialData.format,
                venue: initialData.venue,
                match_date: initialData.match_date,
                match_time: initialData.match_time,
                email: initialData.email,
                phone: initialData.phone,
                notes: cleanNotes,
                club_id: initialData.club_id,
                location_address: initialData.location_address || '',
                location_city: initialData.location_city || '',
                location_zip: initialData.location_zip || '',
                pitch_type: initialData.pitch_type
            });
        } else if (user) {
            setFormData(prev => ({
                ...prev,
                club_id: user.club?.id || prev.club_id,
                location_address: user.club?.address || prev.location_address || '',
                location_city: user.club?.city || prev.location_city || '',
                location_zip: user.club?.zip || prev.location_zip || '',
                email: user.email || prev.email || '',
                phone: user.phone || prev.phone || '',
                category: user.category as Category || prev.category,
                level: user.level as Level || prev.level,
                pitch_type: user.pitch_type as PitchType || prev.pitch_type,
            }));
        }
    }, [initialData, user]);

    const formatPhoneNumber = (value: string) => {
        // Build formatted value
        let raw = value.replace(/\D/g, '');

        // Ensure it starts with 33 if not empty
        if (raw.length > 0 && !raw.startsWith('33')) {
            if (raw.startsWith('0')) raw = '33' + raw.substring(1);
            else raw = '33' + raw;
        }

        // Limit length (33 + 9 digits = 11 digits max for +33 X XX XX XX XX)
        if (raw.length > 11) raw = raw.substring(0, 11);

        // Format
        let formatted = '';
        if (raw.length > 0) formatted += '+';
        if (raw.length > 0) formatted += raw.substring(0, 2); // 33
        if (raw.length > 2) formatted += ' ' + raw.substring(2, 3); // 6 or 7
        if (raw.length > 3) formatted += ' ' + raw.substring(3, 5); // 12
        if (raw.length > 5) formatted += ' ' + raw.substring(5, 7); // 34
        if (raw.length > 7) formatted += ' ' + raw.substring(7, 9); // 56
        if (raw.length > 9) formatted += ' ' + raw.substring(9, 11); // 78

        return formatted;
    };

    const handleChange = (field: keyof CreateMatchDto, value: any) => {
        if (errors[field as string]) {
            setErrors(prev => ({ ...prev, [field as string]: "" }));
        }
        if (field === 'phone') {
            const formatted = formatPhoneNumber(value);
            setFormData(prev => ({ ...prev, [field]: formatted }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.category) newErrors.category = "La catégorie est obligatoire.";
        if (!formData.level) newErrors.level = "Le niveau est obligatoire.";
        if (!formData.format) newErrors.format = "Le format est obligatoire.";
        if (!formData.match_date) newErrors.match_date = "La date est obligatoire.";
        if (!formData.match_time) newErrors.match_time = "L'heure est obligatoire.";
        if (!formData.venue) newErrors.venue = "Le lieu est obligatoire.";
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
            addToast({ title: t('warning', 'Attention'), description: t('matchForm.alerts.must_link', 'Veuillez lier votre club avant de créer un match'), variant: 'flat', color: 'warning' });
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

        // Prevent far future dates (e.g. > 2 years) to avoid spam/mistakes
        const twoYearsFromNow = new Date();
        twoYearsFromNow.setFullYear(now.getFullYear() + 2);
        if (selectedDate > twoYearsFromNow) {
            addToast({ title: t('error'), description: t('matchForm.alerts.date_far'), variant: 'flat', color: 'danger' });
            return;
        }
        setIsSaving(true);
        try {
            // Sync phone to profile if missing or different
            if (user && formData.phone && user.phone !== formData.phone) {
                // Background update, don't await to block UI but catch errors
                updateUser({ phone: formData.phone }).catch(e => console.error("Auto-sync phone error:", e));
            }

            const payload = {
                ...formData,
                notes: `Genre: ${gender}\n${formData.notes || ''}`.trim()
            };

            if (initialData?.id) {
                await updateMatch(initialData.id, payload as any);
                addToast({ title: t('success', 'Succès'), description: t('matchForm.alerts.update_success', 'Match mis à jour avec succès'), variant: 'flat', color: 'success' });
            } else {
                await createMatch(payload as any);
                addToast({ title: t('success', 'Succès'), description: t('matchForm.alerts.create_success', 'Match créé avec succès'), variant: 'flat', color: 'success' });
            }
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
            formData.category,
            formData.level,
            formData.format,
            gender,
            formData.match_date,
            formData.match_time,
            formData.venue,
            formData.pitch_type,
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
            <Card className="shadow-medium border-violet-800/20 bg-violet-900/10">
                <CardHeader className="flex gap-3 bg-linear-to-r from-violet-800/20 to-transparent px-6 py-4">
                    <div className="p-2 bg-violet-800/30 rounded-lg text-violet-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-md font-bold text-violet-300">{t('matchForm.title')}</p>
                        <p className="text-small text-default-500">{t('matchForm.subtitle')}</p>
                    </div>
                </CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
                    {/* Row 1: SIRET (Left) and Address Details (Right) */}
                    <div className="md:col-span-2">
                        {!user?.club_id ? (
                            <div className="p-5 bg-violet-900/20 border-2 border-violet-700/50 rounded-2xl flex flex-col gap-4 shadow-sm h-full">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-violet-800/40 rounded-full text-violet-400 shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h4 className="text-sm font-black text-violet-100 uppercase tracking-tighter">
                                            {t('matchForm.link_club.title')}
                                        </h4>
                                        <p className="text-sm text-violet-200 font-bold leading-tight">
                                            Veuillez renseigner votre SIRET dans votre profil pour publier.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <Button
                                        size="sm"
                                        color="secondary"
                                        className="w-full font-black px-8 shadow-md h-9 uppercase tracking-tighter"
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
                                        <span className="text-success-900 font-black uppercase tracking-tighter text-xs sm:text-sm">{t('matchForm.link_club.linked')}</span>
                                        <span className="text-success-700 font-bold text-xl">{user.club?.name}</span>
                                    </div>
                                </div>
                                {auth0User?.email === 'yannidelattrebalcer.artois@gmail.com' && (
                                    <Button size="sm" color="danger" variant="flat" onPress={async () => {
                                        try {
                                            await unlinkClub();
                                        } catch (e: any) {
                                            alert(e.message);
                                        }
                                    }}>{t('matchForm.buttons.unlink')}</Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-3 justify-center">
                        <Input
                            label={t('matchForm.labels.address')}
                            placeholder={t('matchForm.labels.auto_siret')}
                            value={formData.location_address || ''}
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
                                value={formData.location_zip || ''}
                                isDisabled
                                classNames={{
                                    inputWrapper: "bg-default-100! text-default-500",
                                    label: "text-default-500 font-bold"
                                }}
                            />
                            <Input
                                label={t('matchForm.labels.city')}
                                placeholder={t('matchForm.labels.auto')}
                                value={formData.location_city || ''}
                                isDisabled
                                classNames={{
                                    inputWrapper: "bg-default-100! text-default-500",
                                    label: "text-default-500 font-bold"
                                }}
                            />
                        </div>
                        <p className="text-xs sm:text-sm text-default-400 italic leading-tight px-1">
                            {t('matchForm.labels.stadium_note', "Si l'adresse de votre siège social (liée au SIRET) diffère du lieu de la rencontre, veuillez préciser l'adresse exacte du stade dans les notes de l'événement.")}
                        </p>
                    </div>

                    {/* Row 2: Category, Level, Format, Gender */}
                    <div className="space-y-1">
                        <Select
                            label={t('matchForm.labels.category')}
                            placeholder={t('matchForm.labels.choose')}
                            selectedKeys={formData.category ? [formData.category] : []}
                            onChange={(e) => handleChange('category', e.target.value)}
                            isRequired
                            isInvalid={!!errors.category}
                            startContent={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                                </svg>
                            }
                        >
                            {Object.values(Category).map((cat) => (
                                <SelectItem key={cat}>{t(`enums.category.${cat}`)}</SelectItem>
                            ))}
                        </Select>
                        {errors.category && <p className="text-xs sm:text-sm text-danger font-bold pl-1">{errors.category}</p>}
                    </div>
                    <div className="space-y-1">
                        <Select
                            label={t('matchForm.labels.level')}
                            placeholder={t('matchForm.labels.choose')}
                            selectedKeys={formData.level ? [formData.level] : []}
                            onChange={(e) => handleChange('level', e.target.value)}
                            isRequired
                            isInvalid={!!errors.level}
                            startContent={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                    <path fillRule="evenodd" d="M11.484 2.17a.75.75 0 011.032 0 11.209 11.209 0 007.877 3.08.75.75 0 01.75.75V12a11.386 11.386 0 01-3.587 8.35c-2.433 2.193-5.338 3.4-8.556 3.401-3.218.001-6.123-1.208-8.556-3.401A11.389 11.389 0 011.5 12V6a.75.75 0 01.75-.75 11.21 11.21 0 007.877-3.08zM12 4.296a12.71 12.71 0 01-6.643 2.056l-.357.043V12c0 2.215.72 4.297 1.956 6.012C8.21 19.78 9.976 20.914 12 20.916c2.024-.002 3.79-1.136 5.044-2.904A9.889 9.889 0 0019 12V6.395a12.72 12.72 0 01-7 2.099z" clipRule="evenodd" />
                                </svg>
                            }
                        >
                            {Object.values(Level).map((cat) => (
                                <SelectItem key={cat}>{t(`enums.level.${cat}`)}</SelectItem>
                            ))}
                        </Select>
                        {errors.level && <p className="text-xs sm:text-sm text-danger font-bold pl-1">{errors.level}</p>}
                    </div>
                    <div className="space-y-1">
                        <Select
                            label={t('matchForm.labels.format')}
                            placeholder={t('matchForm.labels.choose')}
                            selectedKeys={formData.format ? [formData.format] : []}
                            onChange={(e) => handleChange('format', e.target.value)}
                            isRequired
                            isInvalid={!!errors.format}
                            startContent={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                    <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.365-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
                                </svg>
                            }
                        >
                            <SelectItem key="11v11">11 vs 11</SelectItem>
                            <SelectItem key="8v8">8 vs 8</SelectItem>
                            <SelectItem key="5v5">5 vs 5</SelectItem>
                            <SelectItem key="Futsal">Futsal</SelectItem>
                        </Select>
                        {errors.format && <p className="text-xs sm:text-sm text-danger font-bold pl-1">{errors.format}</p>}
                    </div>
                    <Select
                        label={t('matchForm.labels.gender')}
                        placeholder={t('matchForm.labels.choose')}
                        selectedKeys={[gender]}
                        onChange={(e) => setGender(e.target.value)}
                        startContent={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                            </svg>
                        }
                    >
                        <SelectItem key="Masculin">{t('enums.gender.Masculin')}</SelectItem>
                        <SelectItem key="Féminin">{t('enums.gender.Féminin')}</SelectItem>
                        <SelectItem key="Mixte">{t('enums.gender.Mixte')}</SelectItem>
                        <SelectItem key="Non spécifié">{t('enums.gender.Non spécifié')}</SelectItem>
                    </Select>

                    <div className="space-y-1">
                        <Input
                            type="date"
                            label={t('matchForm.labels.date')}
                            value={formData.match_date}
                            onValueChange={(v) => handleChange('match_date', v)}
                            min={new Date().toISOString().split('T')[0]}
                            isRequired
                            isInvalid={!!errors.match_date}
                            startContent={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                    <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
                                    <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
                                </svg>
                            }
                        />
                        {errors.match_date && <p className="text-xs sm:text-sm text-danger font-bold pl-1">{errors.match_date}</p>}
                    </div>
                    <div className="space-y-1">
                        <Input
                            type="time"
                            label={t('matchForm.labels.time')}
                            value={formData.match_time}
                            onValueChange={(v) => handleChange('match_time', v)}
                            isRequired
                            isInvalid={!!errors.match_time}
                            startContent={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                                </svg>
                            }
                        />
                        {errors.match_time && <p className="text-xs sm:text-sm text-danger font-bold pl-1">{errors.match_time}</p>}
                    </div>
                    <div className="space-y-1">
                        <Select
                            label={t('matchForm.labels.venue')}
                            placeholder={t('matchForm.labels.choose')}
                            selectedKeys={formData.venue ? [formData.venue] : []}
                            onChange={(e) => handleChange('venue', e.target.value)}
                            isRequired
                            isInvalid={!!errors.venue}
                            startContent={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                            }
                        >
                            <SelectItem key="Domicile">{t('matchForm.venue_labels.Domicile')}</SelectItem>
                            <SelectItem key="Extérieur">{t('matchForm.venue_labels.Extérieur')}</SelectItem>
                            <SelectItem key="Neutre">{t('enums.venue.Neutre')}</SelectItem>
                        </Select>
                        {errors.venue && <p className="text-xs sm:text-sm text-danger font-bold pl-1">{errors.venue}</p>}
                    </div>

                    <div className="space-y-1">
                        <Select
                            label={t('matchForm.labels.pitch_type')}
                            placeholder={t('matchForm.labels.choose')}
                            selectedKeys={formData.pitch_type ? [formData.pitch_type] : []}
                            onChange={(e) => handleChange('pitch_type', e.target.value)}
                            isRequired
                            isInvalid={!!errors.pitch_type}
                            startContent={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                    <path fillRule="evenodd" d="M.75 9.75a3 3 0 0 1 3-3h16.5a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H3.75a3 3 0 0 1-3-3v-9Zm3-1.5a1.5 1.5 0 0 0-1.5 1.5v9a1.5 1.5 0 0 0 1.5 1.5h16.5a1.5 1.5 0 0 0 1.5-1.5v-9a1.5 1.5 0 0 0-1.5-1.5H3.75Z" clipRule="evenodd" />
                                    <path fillRule="evenodd" d="M3.75 12a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1-.75-.75V12Zm3.75 0a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H8.25a.75.75 0 0 1-.75-.75V12Zm3.75 0a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H12a.75.75 0 0 1-.75-.75V12Zm3.75 0a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H15.75a.75.75 0 0 1-.75-.75V12Zm3.75 0a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H19.5a.75.75 0 0 1-.75-.75V12Z" clipRule="evenodd" />
                                </svg>
                            }
                        >
                            {PITCH_TYPES.map((type) => (
                                <SelectItem key={type}>{t(`enums.pitch.${type}`)}</SelectItem>
                            ))}
                        </Select>
                        {errors.pitch_type && <p className="text-xs sm:text-sm text-danger font-bold pl-1">{errors.pitch_type}</p>}
                    </div>

                    {/* Removed Row 3 since it was moved to Row 1 */}

                    {/* Row 4: Centered Progress Bar */}
                    <div className="md:col-span-4 flex flex-col justify-center space-y-3 mt-4">
                        <div className="w-full md:w-[64%] mx-auto flex flex-col space-y-3">
                            <p className="text-sm font-bold text-violet-300 uppercase tracking-tight text-center">
                                {t('matchForm.progress')}: {progress}%
                            </p>
                            <div className="w-full h-4 bg-violet-900/30 rounded-full overflow-hidden p-px border border-violet-800/20 ring-1 ring-violet-500/10 shadow-inner">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                    style={{
                                        width: `${progress}%`,
                                        background: 'linear-gradient(90deg, #5b21b6 0%, #7c3aed 50%, #c4b5fd 100%)',
                                        backgroundSize: '200% 100%'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader className="font-bold bg-default-50">{t('matchForm.contact_title')}</CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Input
                            label={t('matchForm.labels.email')}
                            type="email"
                            value={formData.email}
                            onValueChange={(v) => handleChange('email', v)}
                            isRequired
                            isInvalid={!!errors.email}
                        />
                        {errors.email && <p className="text-xs sm:text-sm text-danger font-bold pl-1">{errors.email}</p>}
                    </div>
                    <div className="space-y-1">
                        <Input
                            label={t('matchForm.labels.phone')}
                            type="tel"
                            value={formData.phone}
                            onValueChange={(v) => handleChange('phone', v)}
                            isRequired
                            isInvalid={!!errors.phone}
                        />
                        {errors.phone && <p className="text-xs sm:text-sm text-danger font-bold pl-1">{errors.phone}</p>}
                    </div>
                    <Textarea
                        label={t('matchForm.labels.notes')}
                        placeholder={t('matchForm.labels.more_info')}
                        value={formData.notes || ''}
                        onValueChange={(v) => handleChange('notes', v)}
                        minRows={3}
                        className="md:col-span-2"
                    />
                </CardBody>
            </Card>

            <div className="flex justify-end gap-2 mt-4">
                {onCancel && (
                    <Button type="button" variant="light" onClick={onCancel}>
                        {t('matchForm.buttons.cancel')}
                    </Button>
                )}
                <Button type="submit" color="secondary" className="bg-violet-700 font-bold text-white" isLoading={isSaving} isDisabled={isLocked}>
                    {initialData ? t('matchForm.buttons.update', 'METTRE À JOUR') : t('matchForm.buttons.create', 'CRÉER DÉFINITIVEMENT')}
                </Button>
            </div>
        </form>
    );
}
