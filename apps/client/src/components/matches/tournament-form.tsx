import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Select, SelectItem } from "@heroui/select";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Progress } from "@heroui/progress";
import { Category } from '@/types/exercise.types';
import { Level, PitchType } from '@/types/match.types';
import { useUser } from '@/hooks/use-user';
import { addToast } from "@heroui/toast";
import { useMatches } from '@/hooks/use-matches';

interface TournamentFormProps {
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const PITCH_TYPES: PitchType[] = ['Herbe', 'Synthétique', 'Hybride', 'Stabilisé', 'Toutes surfaces'];

export default function TournamentForm({ initialData, onSuccess, onCancel }: TournamentFormProps) {
    const { t } = useTranslation();
    const { createMatch, updateMatch } = useMatches();
    const { user } = useUser();

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
        match_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0],
        match_time: '09:00',
        match_end_time: '11:00',
        email: '',
        phone: '',
        notes: '',
        pitch_type: 'Herbe' as PitchType,
        location_address: '',
        location_zip: '',
        location_city: '',
        club_id: '',
        jersey_color: ''
    });

    const [gender, setGender] = useState<string>('Masculin');

    useEffect(() => {
        if (initialData) {
            const genderMatch = initialData.notes?.match(/Genre: (.*)(\n|$)/);
            let extractedGender = genderMatch ? genderMatch[1].trim() : 'Masculin';
            if (extractedGender.startsWith('enums.gender.')) {
                extractedGender = extractedGender.replace('enums.gender.', '');
            }
            const cleanNotes = initialData.notes?.replace(/Genre: .*(\n|$)/, '').trim() || '';

            setGender(extractedGender);
            setFormData({
                name: initialData.name || '',
                category: initialData.category,
                level: initialData.level,
                format: initialData.format,
                venue: initialData.venue,
                max_teams: initialData.max_teams?.toString() || '16',
                registration_fee: initialData.registration_fee?.toString() || '0',
                match_date: initialData.match_date,
                match_time: initialData.match_time,
                match_end_time: initialData.match_end_time || '11:00',
                email: initialData.email,
                phone: initialData.phone,
                notes: cleanNotes,
                club_id: initialData.club_id || '',
                location_address: initialData.location_address || '',
                location_zip: initialData.location_zip || '',
                location_city: initialData.location_city || '',
                pitch_type: initialData.pitch_type || 'Herbe',
                jersey_color: initialData.jersey_color || ''
            });
        } else if (user) {
            setFormData(prev => ({
                ...prev,
                club_id: prev.club_id || user.club?.id || '',
                email: user.email || prev.email || '',
                phone: user.phone || prev.phone || '',
                location_address: prev.club_id === user.club?.id ? (user.stadium_address || user.club?.address || '') : prev.location_address || '',
                location_zip: prev.club_id === user.club?.id ? user.club?.zip || '' : prev.location_zip || '',
                location_city: prev.club_id === user.club?.id ? user.club?.city || '' : prev.location_city || '',
                category: user.category as Category || prev.category,
                level: user.level as Level || prev.level,
                pitch_type: user.pitch_type as PitchType || prev.pitch_type,
                jersey_color: user.home_jersey_color || prev.jersey_color || ''
            }));
        }
    }, [user, initialData]);

    useEffect(() => {
        if (!initialData && user && formData.club_id) {
            if (formData.club_id === user.club?.id) {
                setFormData(prev => ({
                    ...prev,
                    location_address: user.stadium_address || user.club?.address || '',
                    location_city: user.club?.city || '',
                    location_zip: user.club?.zip || ''
                }));
            } else {
                const addClub = user.additional_clubs?.find(c => c.id === formData.club_id);
                setFormData(prev => ({
                    ...prev,
                    location_address: addClub?.stadium_address || addClub?.address || '',
                    location_city: addClub?.city || '',
                    location_zip: addClub?.zip || ''
                }));
            }
        }
    }, [formData.club_id, user, initialData]);

    const formatPhoneNumber = (value: string) => {
        let raw = value.replace(/\D/g, '');
        if (raw.length > 0 && !raw.startsWith('33')) {
            if (raw.startsWith('0')) raw = '33' + raw.substring(1);
            else raw = '33' + raw;
        }
        if (raw.length > 11) raw = raw.substring(0, 11);
        let formatted = '';
        if (raw.length > 0) formatted += '+';
        if (raw.length > 0) formatted += raw.substring(0, 2);
        if (raw.length > 2) formatted += ' ' + raw.substring(2, 3);
        if (raw.length > 3) formatted += ' ' + raw.substring(3, 5);
        if (raw.length > 5) formatted += ' ' + raw.substring(5, 7);
        if (raw.length > 7) formatted += ' ' + raw.substring(7, 9);
        if (raw.length > 9) formatted += ' ' + raw.substring(9, 11);
        return formatted;
    };

    const handleChange = (field: string, value: any) => {
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
        if (field === 'phone') {
            setFormData(prev => ({ ...prev, [field]: formatPhoneNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
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
        if (!formData.phone || formData.phone.replace(/\D/g, '').length < 11) newErrors.phone = "Le téléphone est obligatoire.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!user?.club_id) return;

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                type: 'tournament' as const,
                max_teams: parseInt(formData.max_teams),
                registration_fee: parseFloat(formData.registration_fee),
                notes: `Genre: ${gender}\n${formData.notes || ''}`.trim()
            };

            if (initialData?.id) {
                await updateMatch(initialData.id, payload as any);
                addToast({ title: t('success'), description: t('dashboard.alerts.success_discrete'), color: 'success' });
            } else {
                await createMatch(payload as any);
                addToast({ title: t('success'), description: t('tournamentForm.alerts.create_success'), color: 'success' });
            }

            if (onSuccess) onSuccess();
        } catch (error: any) {
            addToast({ title: t('error'), description: error.message || t('error.save_failed'), color: 'danger' });
        } finally {
            setIsSaving(false);
        }
    };

    const showLockedInfo = (type: 'address' | 'city' | 'zip' | 'jersey') => {
        if (type === 'jersey') {
            addToast({ title: "Information", description: "Veuillez modifier la couleur de votre maillot dans votre compte.", color: "warning" });
        } else if (type === 'address') {
            addToast({ title: "Information", description: "Pour modifier l'adresse, rendez-vous dans l'onglet 'Mon Compte'. Elle sera mise à jour automatiquement.", color: "primary" });
        } else {
            addToast({ title: "Information", description: "Cette information est liée à votre SIRET. Veuillez contacter le support pour la modifier.", color: "primary" });
        }
    };

    const availableClubs = user ? [
        { id: user.club?.id || 'primary', name: user.club?.name || 'Club Principal', description: 'Club Principal' },
        ...(user.additional_sirets || []).map((item: any) => {
            const s = typeof item === 'string' ? item : item.siret;
            const clubInfo = user.additional_clubs?.find(c => c.siret === s);
            return {
                id: clubInfo?.id || s,
                name: clubInfo?.name || s,
                description: 'Club Secondaire'
            };
        })
    ] : [];

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-appearance-in pb-12">
            <Card className="shadow-none border-none bg-transparent">
                <CardHeader className="flex gap-3 bg-[#1e0a29] rounded-t-2xl px-6 py-4 border-b border-white/5">
                    <div className="p-2.5 bg-purple-800/30 rounded-xl text-purple-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-base font-black text-white uppercase tracking-tight leading-none mb-1">Créer un Tournoi Amical</p>
                        <p className="text-[11px] text-zinc-400 font-medium">Organisez une compétition et invitez des équipes.</p>
                    </div>
                </CardHeader>

                <CardBody className="bg-[#0f0717] rounded-b-2xl p-6 flex flex-col gap-8">
                    {/* Top Row: Club and stadium */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Club Block */}
                        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-emerald-500/20 rounded-full text-emerald-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" /></svg>
                                </div>
                                <div className="flex flex-col w-full min-w-0">
                                    <span className="text-[10px] font-black uppercase text-emerald-500/70 tracking-tighter">CLUB LIÉ</span>
                                    {Array.isArray(user?.additional_sirets) && user.additional_sirets.length > 0 ? (
                                        <Dropdown>
                                            <DropdownTrigger>
                                                <Button className="h-auto p-0 min-w-0 bg-transparent text-left justify-start" endContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-400/50"><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>} size="sm">
                                                    <span className="text-sm font-black text-emerald-100 uppercase truncate">
                                                        {formData.club_id === user.club?.id || !formData.club_id ? user.club?.name || 'Club Principal' : user.additional_clubs?.find(c => c.id === formData.club_id)?.name || formData.club_id}
                                                    </span>
                                                </Button>
                                            </DropdownTrigger>
                                            <DropdownMenu onAction={(key) => handleChange('club_id', key as string)} selectedKeys={[formData.club_id || user.club?.id || 'primary']} selectionMode="single" items={availableClubs}>
                                                {(item: any) => (
                                                    <DropdownItem key={item.id} description={item.description} className="text-emerald-900">
                                                        <span className="font-bold">{item.name}</span>
                                                    </DropdownItem>
                                                )}
                                            </DropdownMenu>
                                        </Dropdown>
                                    ) : (
                                        <span className="text-sm font-black text-emerald-100 uppercase truncate">{user?.club?.name}</span>
                                    )}
                                </div>
                            </div>
                            <Button size="sm" variant="flat" className="bg-red-950/30 text-red-400/80 font-bold border border-red-900/20 py-4">
                                Détacher (Admin)
                            </Button>
                        </div>

                        {/* stadium Block */}
                        <div className="flex flex-col gap-3">
                            <div className="relative cursor-pointer" onClick={() => showLockedInfo('address')}>
                                <Input
                                    label="Adresse du stade"
                                    value={formData.location_address}
                                    isDisabled
                                    variant="faded"
                                    classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                                    size="sm"
                                    endContent={
                                        <div className="flex items-center h-full">
                                            <div className="bg-emerald-500 text-[#0f0717] text-[10px] sm:text-[11px] font-black px-2 py-1 rounded-full flex items-center gap-1 leading-none shadow-lg shadow-emerald-500/20 whitespace-nowrap">
                                                <span>🏟️</span>
                                                <span className="mb-[1px]">STADE</span>
                                            </div>
                                        </div>
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="cursor-pointer" onClick={() => showLockedInfo('zip')}>
                                    <Input
                                        label="Code Postal"
                                        value={formData.location_zip}
                                        isDisabled
                                        variant="faded"
                                        classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                                        size="sm"
                                    />
                                </div>
                                <div className="cursor-pointer" onClick={() => showLockedInfo('city')}>
                                    <Input
                                        label="Ville"
                                        value={formData.location_city}
                                        isDisabled
                                        variant="faded"
                                        classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                                        size="sm"
                                    />
                                </div>
                            </div>
                            </div>
                        </div>

                    {/* Main match details grid (Mix grid) */}
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <Input
                                    label="Nom du tournoi"
                                    placeholder="Ex: Tournoi d'été Kdufoot"
                                    value={formData.name}
                                    onValueChange={(v) => handleChange('name', v)}
                                    isRequired
                                    variant="faded"
                                    classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                                    size="sm"
                                />
                            </div>
                            <Select
                                label="Catégorie"
                                selectedKeys={[formData.category]}
                                onChange={(e) => handleChange('category', e.target.value)}
                                isRequired
                                variant="faded"
                                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                                size="sm"
                            >
                                {Object.values(Category).map((cat) => (
                                    <SelectItem key={cat}>{t(`enums.category.${cat}`)}</SelectItem>
                                ))}
                            </Select>
                            <Select
                                label="Niveau"
                                selectedKeys={[formData.level]}
                                onChange={(e) => handleChange('level', e.target.value)}
                                isRequired
                                variant="faded"
                                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                                size="sm"
                            >
                                {Object.values(Level).map((lvl) => (
                                    <SelectItem key={lvl}>{t(`enums.level.${lvl}`)}</SelectItem>
                                ))}
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input
                                type="number"
                                label="Nombre d'équipes max"
                                value={formData.max_teams}
                                onValueChange={(v) => handleChange('max_teams', v)}
                                isRequired
                                variant="faded"
                                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                                size="sm"
                            />
                            <Input
                                type="number"
                                label="Frais d'inscription (€)"
                                value={formData.registration_fee}
                                onValueChange={(v) => handleChange('registration_fee', v)}
                                variant="faded"
                                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                                size="sm"
                            />
                            <Select
                                label="Genre"
                                selectedKeys={[gender]}
                                onChange={(e) => setGender(e.target.value)}
                                variant="faded"
                                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                                size="sm"
                            >
                                <SelectItem key="Masculin">Masculin</SelectItem>
                                <SelectItem key="Féminin">Féminin</SelectItem>
                                <SelectItem key="Mixte">Mixte</SelectItem>
                            </Select>
                            <Select
                                label="Type terrain"
                                selectedKeys={[formData.pitch_type]}
                                onChange={(e) => handleChange('pitch_type', e.target.value)}
                                isRequired
                                variant="faded"
                                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                                size="sm"
                            >
                                {PITCH_TYPES.map((type) => (
                                    <SelectItem key={type}>{type}</SelectItem>
                                ))}
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                type="date"
                                label="Date de début"
                                value={formData.match_date}
                                onValueChange={(v) => handleChange('match_date', v)}
                                isRequired
                                variant="faded"
                                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                                size="sm"
                                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]}
                            />
                            <Input
                                type="time"
                                label="Heure de rendez-vous"
                                value={formData.match_time}
                                onValueChange={(v) => handleChange('match_time', v)}
                                isRequired
                                variant="faded"
                                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                                size="sm"
                            />
                            <Input
                                type="time"
                                label="Heure de fin"
                                value={formData.match_end_time}
                                onValueChange={(v) => handleChange('match_end_time', v)}
                                isRequired
                                variant="faded"
                                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                                size="sm"
                            />
                        </div>
                    </div>

                    {/* Progress Bar Section */}
                    <div className="flex flex-col gap-2 mt-4">
                        <div className="flex justify-center text-center px-4">
                            <span className="text-[11px] font-black text-purple-300 uppercase tracking-[0.15em] leading-tight">
                                PRÉPARATION DE L'ANNONCE DU TOURNOI: 91%
                            </span>
                        </div>
                        <Progress 
                            aria-label="Preparation"
                            value={91} 
                            className="h-2"
                            classNames={{
                                base: "bg-purple-900/20 rounded-full overflow-hidden",
                                indicator: "bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                            }}
                        />
                    </div>
                </CardBody>
            </Card>

            {/* Second Card: Contact & Notes */}
            <Card className="shadow-none border-none bg-transparent">
                <CardHeader className="bg-[#160d21] rounded-t-2xl px-6 py-3 border-b border-white/5">
                    <p className="text-sm font-black text-white uppercase tracking-tight">Contact & Infos complémentaires</p>
                </CardHeader>
                <CardBody className="bg-[#0f0717] rounded-b-2xl p-6 flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Email de contact"
                            type="email"
                            value={formData.email}
                            onValueChange={(v) => handleChange('email', v)}
                            isRequired
                            variant="faded"
                            classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                            size="sm"
                        />
                        <Input
                            label="Téléphone"
                            value={formData.phone}
                            onValueChange={(v) => handleChange('phone', v)}
                            isRequired
                            variant="faded"
                            classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                            size="sm"
                        />
                    </div>
                    <Textarea
                        label="Informations sur le tournoi"
                        placeholder="Règlement, récompenses, restauration..."
                        value={formData.notes}
                        onValueChange={(v) => handleChange('notes', v)}
                        variant="faded"
                        classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                        minRows={3}
                    />

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="light" onPress={onCancel} className="font-bold text-zinc-500">
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            isLoading={isSaving}
                            className="bg-purple-600 font-black uppercase tracking-tighter px-12 rounded-xl shadow-lg shadow-purple-500/20"
                        >
                            {initialData ? "Mettre à jour" : "Publier l'annonce"}
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </form>
    );
}
