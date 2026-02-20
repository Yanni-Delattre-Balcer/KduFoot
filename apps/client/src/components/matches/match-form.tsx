import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Select, SelectItem } from "@heroui/select";
import { Card, CardBody, CardHeader } from '@heroui/card';
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
    const { user, linkClub, unlinkClub, updateUser } = useUser();
    const { user: auth0User } = useAuth0();
    const [isSaving, setIsSaving] = useState(false);
    const [siret, setSiret] = useState('');
    const [isLinking, setIsLinking] = useState(false);

    const handleLinkClub = async () => {
        const cleanSiret = siret.replace(/\s/g, '').trim();
        if (!cleanSiret || cleanSiret.length !== 14) {
            alert(t('matchForm.alerts.siret_length'));
            return;
        }
        const confirmed = confirm(t('matchForm.alerts.link_confirm'));
        if (!confirmed) return;
        setIsLinking(true);
        try {
            await linkClub(cleanSiret);
        } catch (error: any) {
            alert(error.message || t('matchForm.alerts.link_error'));
        } finally {
            setIsLinking(false);
        }
    };

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
            const extractedGender = genderMatch ? genderMatch[1] : 'Masculin';
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
                phone: user.phone || prev.phone || ''
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
        if (field === 'phone') {
            const formatted = formatPhoneNumber(value);
            setFormData(prev => ({ ...prev, [field]: formatted }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.club_id) {
            alert(t('matchForm.alerts.must_link'));
            return;
        }

        // Enforcement: Mandatory profile picture (REMOVED as requested)
        /*
        const isDefaultAvatar = auth0User?.picture?.includes('gravatar.com') ||
            auth0User?.picture?.includes('default') ||
            !auth0User?.picture;

        if (isDefaultAvatar) {
            alert('⚠️ PHOTO DE PROFIL OBLIGATOIRE\n\nVous devez ajouter une photo de vous....');
            return;
        }
        */

        if (!formData.email || !formData.phone) {
            alert(t('matchForm.alerts.contact_required'));
            return;
        }

        // SECURITY: Date Validation
        const now = new Date();
        const selectedDate = new Date(formData.match_date!);
        const [hours, minutes] = (formData.match_time || '00:00').split(':').map(Number);
        selectedDate.setHours(hours, minutes);

        if (selectedDate < now) {
            alert(t('matchForm.alerts.date_past'));
            return;
        }

        // Prevent far future dates (e.g. > 2 years) to avoid spam/mistakes
        const twoYearsFromNow = new Date();
        twoYearsFromNow.setFullYear(now.getFullYear() + 2);
        if (selectedDate > twoYearsFromNow) {
            alert(t('matchForm.alerts.date_far'));
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
            } else {
                await createMatch(payload as any);
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to save match", error);
            alert((error as any).message || t('error.save_failed', 'Erreur lors de la sauvegarde'));
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
            <Card className="shadow-medium border-yellow-500/20 bg-yellow-500/5">
                <CardHeader className="flex gap-3 bg-linear-to-r from-yellow-500/10 to-transparent px-6 py-4">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-md font-bold text-yellow-700">{t('matchForm.title')}</p>
                        <p className="text-small text-default-500">{t('matchForm.subtitle')}</p>
                    </div>
                </CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
                    <Select
                        label={t('matchForm.labels.category')}
                        placeholder={t('matchForm.labels.choose')}
                        selectedKeys={formData.category ? [formData.category] : []}
                        onChange={(e) => handleChange('category', e.target.value)}
                        isRequired
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
                    <Select
                        label={t('matchForm.labels.level')}
                        placeholder={t('matchForm.labels.choose')}
                        selectedKeys={formData.level ? [formData.level] : []}
                        onChange={(e) => handleChange('level', e.target.value)}
                        isRequired
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
                    <Select
                        label={t('matchForm.labels.format')}
                        placeholder={t('matchForm.labels.choose')}
                        selectedKeys={formData.format ? [formData.format] : []}
                        onChange={(e) => handleChange('format', e.target.value)}
                        isRequired
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
                    </Select>

                    <Input
                        type="date"
                        label={t('matchForm.labels.date')}
                        value={formData.match_date}
                        onValueChange={(v) => handleChange('match_date', v)}
                        isRequired
                        startContent={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
                                <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
                            </svg>
                        }
                    />
                    <Input
                        type="time"
                        label={t('matchForm.labels.time')}
                        value={formData.match_time}
                        onValueChange={(v) => handleChange('match_time', v)}
                        isRequired
                        startContent={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                            </svg>
                        }
                    />
                    <Select
                        label={t('matchForm.labels.venue')}
                        placeholder={t('matchForm.labels.choose')}
                        selectedKeys={formData.venue ? [formData.venue] : []}
                        onChange={(e) => handleChange('venue', e.target.value)}
                        isRequired
                        startContent={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-default-400">
                                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                        }
                    >
                        <SelectItem key="Domicile">{t('enums.venue.Domicile')}</SelectItem>
                        <SelectItem key="Extérieur">{t('enums.venue.Extérieur')}</SelectItem>
                        <SelectItem key="Neutre">{t('enums.venue.Neutre')}</SelectItem>
                    </Select>

                    <Select
                        label={t('matchForm.labels.pitch_type')}
                        placeholder={t('matchForm.labels.choose')}
                        selectedKeys={formData.pitch_type ? [formData.pitch_type] : []}
                        onChange={(e) => handleChange('pitch_type', e.target.value)}
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

                    {/* Row 3: SIRET (Left) and Address Details (Right) */}
                    <div className="md:col-span-2">
                        {!user?.club_id ? (
                            <div className="p-5 bg-warning-50 border-2 border-warning-200 rounded-2xl flex flex-col gap-5 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-warning-100 rounded-full text-warning-600 shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h4 className="text-sm md:text-base font-black text-warning-900 uppercase tracking-tighter">
                                            {t('matchForm.link_club.title')}
                                        </h4>
                                        <div className="text-[12px] md:text-[14px] text-warning-800 space-y-2 font-bold leading-snug">
                                            <p className="underline decoration-2 text-warning-900">{t('matchForm.link_club.warning_siret')}</p>
                                            <p>{t('matchForm.link_club.warning_auto')}</p>
                                            <p className="text-warning-950 font-black">{t('matchForm.link_club.warning_final')}</p>
                                            <p className="italic opacity-90 text-[11px] md:text-[13px]">{t('matchForm.link_club.warning_support')}</p>
                                            <p className="border-t border-warning-200/50 pt-2 text-warning-950">{t('matchForm.link_club.warning_search')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 items-center w-full justify-start">
                                    <Input
                                        size="md"
                                        placeholder="EX: 123 456 789 00012"
                                        value={siret}
                                        onValueChange={setSiret}
                                        className="w-full sm:max-w-xs"
                                        classNames={{
                                            inputWrapper: "bg-white border-warning-200 shadow-inner h-10 font-bold"
                                        }}
                                    />
                                    <Button size="md" color="warning" onPress={handleLinkClub} isLoading={isLinking} className="w-full sm:w-auto font-black px-8 shadow-md h-10 uppercase tracking-tighter">
                                        {t('matchForm.link_club.validate')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 bg-success-50 border-2 border-success-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-success-100 rounded-full text-success-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" /></svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-success-900 font-black uppercase tracking-tighter text-[10px]">{t('matchForm.link_club.linked')}</span>
                                        <span className="text-success-700 font-bold text-lg">{user.club?.name}</span>
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
                    </div>

                    {/* Row 4: Centered Progress Bar */}
                    <div className="md:col-span-4 flex flex-col justify-center space-y-3 mt-4">
                        <div className="w-[64%] mx-auto flex flex-col space-y-3">
                            <p className="text-sm font-bold text-yellow-700 uppercase tracking-tight text-center">
                                {t('matchForm.progress')}: {progress}%
                            </p>
                            <div className="w-full h-4 bg-yellow-500/10 rounded-full overflow-hidden p-px border border-yellow-500/20 ring-1 ring-yellow-500/5 shadow-inner">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                                    style={{
                                        width: `${progress}%`,
                                        background: 'linear-gradient(90deg, #eab308 0%, #fbbf24 50%, #fef3c7 100%)',
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
                    <Input
                        label={t('matchForm.labels.email')}
                        type="email"
                        value={formData.email}
                        onValueChange={(v) => handleChange('email', v)}
                        isRequired
                    />
                    <Input
                        label={t('matchForm.labels.phone')}
                        type="tel"
                        value={formData.phone}
                        onValueChange={(v) => handleChange('phone', v)}
                        isRequired
                    />
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
                <Button type="submit" color="warning" className="bg-yellow-500 font-bold text-yellow-950" isLoading={isSaving} isDisabled={!user?.club_id}>
                    {initialData ? t('matchForm.buttons.update') : t('matchForm.buttons.create')}
                </Button>
            </div>
        </form>
    );
}
