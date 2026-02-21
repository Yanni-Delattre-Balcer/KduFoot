import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Select, SelectItem } from "@heroui/select";
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Category } from '@/types/exercise.types';
import { Level, PitchType } from '@/types/match.types';
import { useUser } from '@/hooks/use-user';
import { matchService } from '@/services/matches';
import { useAuth0 } from '@auth0/auth0-react';

interface TournamentFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

const PITCH_TYPES: PitchType[] = ['Herbe', 'Synthétique', 'Hybride', 'Stabilisé', 'Indoor'];

export default function TournamentForm({ onSuccess, onCancel }: TournamentFormProps) {
    const { t } = useTranslation();
    const { user, linkClub } = useUser();
    const { getAccessTokenSilently } = useAuth0();
    const [isSaving, setIsSaving] = useState(false);
    const [siret, setSiret] = useState('');
    const [isLinking, setIsLinking] = useState(false);

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
                location_city: user.club?.city || ''
            }));
        }
    }, [user]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleLinkClub = async () => {
        const cleanSiret = siret.replace(/\s/g, '').trim();
        if (!cleanSiret || cleanSiret.length !== 14) {
            alert(t('matchForm.alerts.siret_length'));
            return;
        }
        setIsLinking(true);
        try {
            await linkClub(cleanSiret);
        } catch (error: any) {
            alert(error.message || t('matchForm.alerts.link_error'));
        } finally {
            setIsLinking(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.club_id) {
            alert(t('matchForm.alerts.must_link'));
            return;
        }

        setIsSaving(true);
        try {
            const token = await getAccessTokenSilently();
            await matchService.create({
                ...formData,
                type: 'tournament',
                club_id: user.club_id,
                max_teams: parseInt(formData.max_teams),
                registration_fee: parseFloat(formData.registration_fee)
            }, token);
            
            if (onSuccess) onSuccess();
        } catch (error: any) {
            alert(error.message || t('error.save_failed'));
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
            <Card className="shadow-medium border-yellow-500/20 bg-yellow-500/5">
                <CardHeader className="flex gap-3 bg-linear-to-r from-yellow-500/10 to-transparent px-6 py-4">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" />
                            <path d="m3.265 10.602 7.641 4.114a.75.75 0 0 0 .712 0l7.641-4.114.679.365a.75.75 0 0 1 0 1.32l-8.32 4.48a.75.75 0 0 1-.712 0l-8.32-4.48a.75.75 0 0 1 0-1.32l.679-.365Z" />
                            <path d="m3.265 14.534 7.641 4.115a.75.75 0 0 0 .712 0l7.641-4.115.679.365a.75.75 0 0 1 0 1.32l-8.32 4.48a.75.75 0 0 1-.712 0l-8.32-4.48a.75.75 0 0 1 0-1.32l.679-.365Z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-md font-bold text-yellow-700">{t('tournamentForm.title')}</p>
                        <p className="text-small text-default-500">{t('tournamentForm.subtitle')}</p>
                    </div>
                </CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
                    <Input
                        label={t('tournamentForm.labels.name')}
                        placeholder={t('tournamentForm.labels.name_placeholder')}
                        value={formData.name}
                        onValueChange={(v) => handleChange('name', v)}
                        className="md:col-span-2"
                        isRequired
                    />
                    <Select
                        label={t('matchForm.labels.category')}
                        selectedKeys={[formData.category]}
                        onChange={(e) => handleChange('category', e.target.value)}
                        isRequired
                    >
                        {Object.values(Category).map((cat) => (
                            <SelectItem key={cat}>{t(`enums.category.${cat}`)}</SelectItem>
                        ))}
                    </Select>
                    <Select
                        label={t('matchForm.labels.level')}
                        selectedKeys={[formData.level]}
                        onChange={(e) => handleChange('level', e.target.value)}
                        isRequired
                    >
                        {Object.values(Level).map((cat) => (
                            <SelectItem key={cat}>{t(`enums.level.${cat}`)}</SelectItem>
                        ))}
                    </Select>

                    <Input
                        type="number"
                        label={t('tournamentForm.labels.max_teams')}
                        value={formData.max_teams}
                        onValueChange={(v) => handleChange('max_teams', v)}
                        isRequired
                    />
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
                    </Select>
                    <Select
                        label={t('matchForm.labels.pitch_type')}
                        selectedKeys={[formData.pitch_type]}
                        onChange={(e) => handleChange('pitch_type', e.target.value)}
                    >
                        {PITCH_TYPES.map((type) => (
                            <SelectItem key={type}>{t(`enums.pitch.${type}`)}</SelectItem>
                        ))}
                    </Select>

                    {/* Date and Times section */}
                    <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            type="date"
                            label={t('tournamentForm.labels.date')}
                            value={formData.match_date}
                            onValueChange={(v) => handleChange('match_date', v)}
                            isRequired
                        />
                        <Input
                            type="time"
                            label={t('tournamentForm.labels.time')}
                            value={formData.match_time}
                            onValueChange={(v) => handleChange('match_time', v)}
                            isRequired
                        />
                        <Input
                            type="time"
                            label={t('tournamentForm.labels.end_time')}
                            value={formData.match_end_time}
                            onValueChange={(v) => handleChange('match_end_time', v)}
                            isRequired
                        />
                        <div className="hidden md:block"></div>
                    </div>

                    {/* Row 4: SIRET (Left) and Address Details (Right) */}
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
                                {user?.email === 'yannidelattrebalcer.artois@gmail.com' && (
                                    <Button size="sm" color="danger" variant="flat" onPress={async () => {
                                        alert("Détachement du club réservé à l'administration.");
                                    }}>{t('matchForm.buttons.unlink')}</Button>
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
                    </div>

                    {/* Row 5: Centered Progress Bar */}
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
                <CardHeader className="font-bold bg-default-50">{t('tournamentForm.contact_title')}</CardHeader>
                <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label={t('tournamentForm.labels.contact_email')} type="email" value={formData.email} onValueChange={(v) => handleChange('email', v)} isRequired />
                    <Input label={t('matchForm.labels.phone')} type="tel" value={formData.phone} onValueChange={(v) => handleChange('phone', v)} isRequired />
                    <Textarea label={t('tournamentForm.labels.notes')} placeholder={t('tournamentForm.labels.notes_placeholder')} value={formData.notes} onValueChange={(v) => handleChange('notes', v)} className="md:col-span-2" />
                </CardBody>
            </Card>

            <div className="flex justify-end gap-2 mt-4">
                {onCancel && <Button variant="light" onClick={onCancel}>{t('matchForm.buttons.cancel')}</Button>}
                <Button type="submit" color="warning" className="bg-yellow-500 font-bold text-yellow-950" isLoading={isSaving} isDisabled={!user?.club_id}>
                    {t('tournamentForm.labels.publish')}
                </Button>
            </div>
        </form>
    );
}
