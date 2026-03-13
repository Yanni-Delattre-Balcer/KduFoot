import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";

import { Image } from "@heroui/image";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { useAuth } from "@/authentication/providers/use-auth";
import { useUser } from "@/hooks/use-user";
import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { useTranslation } from "react-i18next";
import { Category } from "@/types/exercise.types";
import { Level } from "@/types/match.types";
import { mutate } from "swr";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { JerseyColorDots } from "./jersey-color-dots";

const CATEGORIES = Object.values(Category);
const LEVELS = Object.values(Level);

interface AccountSettingsProps {
    onSaveSuccess?: () => void;
}

export const AccountSettings = ({ onSaveSuccess }: AccountSettingsProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const from = searchParams.get('from') || (location.state as any)?.from;
    const { user: authUser, getAccessToken, logout, deleteJson } = useAuth();
    const { user: dbUser, updateUser, linkClub, unlinkClub, refetch } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [licenseId, setLicenseId] = useState("");
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [level, setLevel] = useState("");
    const [category, setCategory] = useState("");
    const [homeJerseyColor, setHomeJerseyColor] = useState("");
    const [awayJerseyColor, setAwayJerseyColor] = useState("");
    const [phone, setPhone] = useState("");
    const [siret, setSiret] = useState("");
    const [stadiumAddress, setStadiumAddress] = useState("");
    const [additionalStadiumAddresses, setAdditionalStadiumAddresses] = useState<Record<string, string>>({});
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handlePhoneChange = (v: string) => {
        setPhone(formatPhoneNumber(v));
    };

    const formatSiret = (value: string) => {
        let raw = value.replace(/\D/g, '');
        if (raw.length > 14) raw = raw.substring(0, 14);

        // Format: XXX XXX XXX XXXXX
        let formatted = '';
        for (let i = 0; i < raw.length; i++) {
            if (i === 3 || i === 6 || i === 9) formatted += ' ';
            formatted += raw[i];
        }
        return formatted;
    };


    // Load face-api models on mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = import.meta.env.VITE_FACEAPI_MODELS_URL;
                if (!MODEL_URL) return;
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                ]);
            } catch (error) {
                console.warn("Failed to load face-api models:", error);
            }
        };
        loadModels();
    }, []);

    // Sync properties from dbUser when it loads
    useEffect(() => {
        if (dbUser && !isInitialized) {
            setFirstname(dbUser.firstname || "");
            setLastname(dbUser.lastname || "");
            setLicenseId(dbUser.license_id || "");
            setLevel(dbUser.level || "");
            setCategory(dbUser.category || "");
            setHomeJerseyColor(dbUser.home_jersey_color || "");
            setAwayJerseyColor(dbUser.away_jersey_color || "");
            setPhone(formatPhoneNumber(dbUser.phone || ""));
            setSiret(formatSiret(dbUser.siret || ""));
            setStadiumAddress(dbUser.stadium_address || "");

            // Initialize additional stadium addresses
            const addAddr: Record<string, string> = {};
            (dbUser.additional_sirets || []).forEach(item => {
                const siret = typeof item === 'string' ? item : item.siret;
                const addr = typeof item === 'object' ? item.stadium_address : "";
                addAddr[siret] = addr || "";
            });
            setAdditionalStadiumAddresses(addAddr);

            setIsInitialized(true);
        }
    }, [dbUser, isInitialized]);

    if (!authUser) return null;

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        try {
            const img = await faceapi.bufferToImage(file);
            const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions());

            if (detections.length === 0) {
                console.warn(t('account.avatar.no_face'));
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Face detection error:", error);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file!);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!firstname || firstname.trim() === "") {
            newErrors.firstname = t('account.errors.firstname_required');
        }
        if (!lastname || lastname.trim() === "") {
            newErrors.lastname = t('account.errors.lastname_required');
        }
        if (!phone || phone.replace(/\D/g, '').length < 11) {
            newErrors.phone = t('account.errors.phone_required');
        }
        if (!licenseId || licenseId.trim() === "") {
            newErrors.licenseId = t('account.errors.license_required');
        }
        if (!category) {
            newErrors.category = t('account.errors.category_required');
        }
        if (!level) {
            newErrors.level = t('account.errors.level_required');
        }
        if (!stadiumAddress || stadiumAddress.trim() === "") {
            newErrors.stadiumAddress = t('account.errors.stadium_required');
        }
        if (!homeJerseyColor || homeJerseyColor.trim() === "") {
            newErrors.homeJerseyColor = t('account.errors.home_jersey_required');
        }
        if (!awayJerseyColor || awayJerseyColor.trim() === "") {
            newErrors.awayJerseyColor = t('account.errors.away_jersey_required');
        }

        const cleanSiret = siret.replace(/\s/g, '').trim();
        if (!dbUser?.club_id && (!siret || (cleanSiret.length !== 14 && cleanSiret.length !== 9))) {
            newErrors.siret = t('account.errors.siret_required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            addToast({ title: t('account.errors.form_incomplete'), description: t('account.errors.form_incomplete_desc'), variant: 'flat', color: 'danger' });
            return;
        }
        setIsSaving(true);
        try {
            const cleanSiret = siret.replace(/\s/g, '').trim();
            if (cleanSiret && cleanSiret !== dbUser?.siret && !dbUser?.club_id) {
                if (cleanSiret.length !== 14 && cleanSiret.length !== 9) {
                    throw new Error(t('matchForm.alerts.siret_length', 'Le numéro doit contenir 9 (SIREN) ou 14 (SIRET) chiffres'));
                }
                await linkClub(cleanSiret);
            }

            await updateUser({
                firstname: firstname.trim(),
                lastname: lastname.trim(),
                license_id: licenseId,
                level,
                category,
                home_jersey_color: homeJerseyColor,
                away_jersey_color: awayJerseyColor,
                phone: phone,
                stadium_address: stadiumAddress,
                additional_sirets: (dbUser?.additional_sirets || []).map(item => {
                    const siret = typeof item === 'string' ? item : item.siret;
                    return {
                        siret,
                        stadium_address: additionalStadiumAddresses[siret] || ""
                    };
                }),
                picture: previewUrl || dbUser?.picture || authUser.picture
            });

            if (onSaveSuccess) onSaveSuccess();

            // Systematic redirection to 'from' or defaults to '/matches'
            navigate(from || '/matches');

            await getAccessToken({ cacheMode: 'off' } as any);
            await refetch();
            await mutate('/api/me/context');
        } catch (error: any) {
            console.error("Update profile error:", error);
            addToast({ title: t('error.title'), description: error.message || t('accountModal.alerts.update_error', 'Erreur de mise à jour'), variant: 'flat', color: 'danger' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm(t('account.confirm_delete'))) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteJson(`${import.meta.env.API_BASE_URL}/api/users/me`);
            addToast({ title: t('success'), description: t('account.delete_success'), variant: 'flat', color: 'success' });
            await logout({
                logoutParams: {
                    returnTo: window.location.origin
                }
            });
        } catch (error: any) {
            console.error("Delete account error:", error);
            addToast({ title: t('error.title'), description: error.message || t('account.delete_error', 'Erreur lors de la suppression du compte'), variant: 'flat', color: 'danger' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleLinkSiret = async () => {
        const cleanSiret = siret.replace(/\s/g, '').trim();
        if (cleanSiret.length !== 14 && cleanSiret.length !== 9) {
            addToast({ title: t('error.title'), description: t('matchForm.alerts.siret_length'), variant: 'flat', color: 'danger' });
            return;
        }

        setIsSaving(true);
        try {
            await linkClub(cleanSiret);
            await getAccessToken({ cacheMode: 'off' } as any);
            await refetch();
            await mutate('/api/me/context');
            addToast({ title: t('success'), description: t('accountModal.alerts.club_linked_success', 'Club certifié avec succès'), variant: 'flat', color: 'success' });
        } catch (error: any) {
            addToast({ title: t('error.title'), description: error.message, variant: 'flat', color: 'danger' });
        } finally {
            setIsSaving(false);
        }
    };

    const getDept = (zip?: string | null) => {
        if (!zip || zip.length < 2) return "";
        return zip.substring(0, 2);
    };

    return (
        <div className="flex flex-col gap-6">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            <div className="flex flex-col items-center gap-6">
                <p className="text-sm font-extrabold text-danger tracking-widest -mb-4 animate-pulse-red">
                    {t('account.avatar.recommendation')}
                </p>

                <div className="relative group cursor-pointer z-10" onClick={handleAvatarClick} role="button" aria-label={t('account.avatar.change')}>
                    <Image
                        src={previewUrl || dbUser?.picture || authUser.picture}
                        className={`w-24 h-24 rounded-full object-cover border-4 border-primary/20 ${isAnalyzing ? 'opacity-50' : ''}`}
                        alt={authUser.name}
                    />
                    <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-lg border-2 border-white z-20">
                        {isAnalyzing ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-label={t('account.avatar.analyzing')} />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-15">
                        <span className="text-white text-xs font-bold">{isAnalyzing ? t('account.avatar.analyzing') : t('account.avatar.change')}</span>
                    </div>
                </div>

                <div className="text-center w-full overflow-hidden">
                    <h3 className="text-lg sm:text-2xl font-bold truncate hover:overflow-x-auto whitespace-nowrap scrollbar-hide">
                        {authUser.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <Chip
                            size="sm"
                            color={dbUser?.subscription === 'Free' ? 'default' : 'primary'}
                            variant="flat"
                            className="font-black px-4 tracking-tighter"
                        >
                            {dbUser?.subscription ? t('account.subscription.free', { plan: dbUser.subscription }) : t('account.subscription.free_account')}
                        </Chip>
                    </div>
                </div>

                <div className="w-full space-y-8">
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-default-400 ml-1">{t('account.sections.identity')}</p>
                        <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-default-500">Email</span>
                                <span className="font-medium">{authUser.email}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Input
                                        id="acc_firstname"
                                        name="acc_firstname"
                                        label={t('account.fields.firstname')}
                                        variant="bordered"
                                        size="sm"
                                        value={firstname}
                                        onValueChange={(v) => {
                                            setFirstname(v);
                                            if (errors.firstname) setErrors(prev => ({ ...prev, firstname: "" }));
                                        }}
                                        isInvalid={!!errors.firstname}
                                        isRequired
                                        aria-label={t('account.fields.firstname')}
                                    />
                                    {errors.firstname && <p className="text-xs font-bold pl-1">{errors.firstname}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        id="acc_lastname"
                                        name="acc_lastname"
                                        label={t('account.fields.lastname')}
                                        variant="bordered"
                                        size="sm"
                                        value={lastname}
                                        onValueChange={(v) => {
                                            setLastname(v);
                                            if (errors.lastname) setErrors(prev => ({ ...prev, lastname: "" }));
                                        }}
                                        isInvalid={!!errors.lastname}
                                        isRequired
                                        aria-label={t('account.fields.lastname')}
                                    />
                                    {errors.lastname && <p className="text-xs font-bold pl-1">{errors.lastname}</p>}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Input
                                    id="acc_phone"
                                    name="acc_phone"
                                    label={t('account.fields.phone')}
                                    variant="bordered"
                                    size="sm"
                                    value={phone}
                                    onValueChange={(v) => {
                                        handlePhoneChange(v);
                                        if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
                                    }}
                                    placeholder="+33 6 12 34 56 78"
                                    isInvalid={!!errors.phone}
                                    isRequired
                                    aria-label={t('account.fields.phone')}
                                />
                                {errors.phone && <p className="text-xs font-bold pl-1">{errors.phone}</p>}
                            </div>
                            <div className="space-y-1">
                                <Input
                                    id="acc_license"
                                    name="acc_license"
                                    label={t('account.fields.license')}
                                    variant="bordered"
                                    size="sm"
                                    value={licenseId}
                                    onValueChange={(v) => {
                                        setLicenseId(v);
                                        if (errors.licenseId) setErrors(prev => ({ ...prev, licenseId: "" }));
                                    }}
                                    placeholder={t('account.fields.license_placeholder')}
                                    isInvalid={!!errors.licenseId}
                                    isRequired
                                    aria-label={t('account.fields.license')}
                                />
                                {errors.licenseId && <p className="text-xs font-bold pl-1">{errors.licenseId}</p>}
                            </div>
                            <div className="space-y-1">
                                <Input
                                    id="acc_hq_address"
                                    name="acc_hq_address"
                                    label={t('account.fields.hq_address')}
                                    aria-label={t('account.fields.hq_address')}
                                    variant="flat"
                                    size="sm"
                                    value={dbUser?.club?.address || "--"}
                                    isDisabled
                                    classNames={{
                                        inputWrapper: "bg-default-200/30",
                                        label: "font-bold text-default-500 whitespace-nowrap"
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <Input
                                    id="acc_stadium_address"
                                    name="acc_stadium_address"
                                    label={t('account.fields.stadium_address')}
                                    variant="bordered"
                                    size="sm"
                                    value={stadiumAddress}
                                    onValueChange={(v) => {
                                        setStadiumAddress(v);
                                        if (errors.stadiumAddress) setErrors(prev => ({ ...prev, stadiumAddress: "" }));
                                    }}
                                    placeholder={t('account.fields.stadium_placeholder')}
                                    isInvalid={!!errors.stadiumAddress}
                                    isRequired
                                    description={t('account.fields.stadium_warning')}
                                    aria-label={t('account.fields.stadium_address')}
                                    classNames={{
                                        description: "text-[10px] text-primary-500 font-medium",
                                        label: "font-black text-primary whitespace-nowrap",
                                    }}
                                />
                                {errors.stadiumAddress && <p className="text-xs text-danger font-bold pl-1">{errors.stadiumAddress}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-bold text-default-400 ml-1 mt-2">{t('account.sections.sports_profile')}</p>
                        <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Select
                                    id="acc_category"
                                    name="acc_category"
                                    label={t('account.fields.category')}
                                    variant="bordered"
                                    size="sm"
                                    selectedKeys={category ? [category] : []}
                                    onChange={(e) => {
                                        setCategory(e.target.value);
                                        if (errors.category) setErrors(prev => ({ ...prev, category: "" }));
                                    }}
                                    placeholder={t('common.choose', 'Choisir...')}
                                    isInvalid={!!errors.category}
                                    aria-label={t('account.fields.category')}
                                >
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} textValue={t(`enums.category.${cat}`)}>
                                            {t(`enums.category.${cat}`)}
                                        </SelectItem>
                                    ))}
                                </Select>
                                {errors.category && <p className="text-xs font-bold pl-1">{errors.category}</p>}
                            </div>
                            <div className="space-y-1">
                                <Select
                                    id="acc_level"
                                    name="acc_level"
                                    label={t('account.fields.level')}
                                    variant="bordered"
                                    size="sm"
                                    selectedKeys={level ? [level] : []}
                                    onChange={(e) => {
                                        setLevel(e.target.value);
                                        if (errors.level) setErrors(prev => ({ ...prev, level: "" }));
                                    }}
                                    placeholder={t('common.choose', 'Choisir...')}
                                    isInvalid={!!errors.level}
                                    aria-label={t('account.fields.level')}
                                >
                                    {LEVELS.map((lvl) => (
                                        <SelectItem key={lvl} textValue={t(`enums.level.${lvl}`)}>
                                            {t(`enums.level.${lvl}`)}
                                        </SelectItem>
                                    ))}
                                </Select>
                                {errors.level && <p className="text-xs font-bold pl-1">{errors.level}</p>}
                            </div>
                            <div className="space-y-1">
                                <Input
                                    id="acc_home_jersey"
                                    name="acc_home_jersey"
                                    label={t('account.fields.home_jersey', 'Couleur maillot Domicile')}
                                    variant="bordered"
                                    size="sm"
                                    value={homeJerseyColor}
                                    onValueChange={(v) => {
                                        setHomeJerseyColor(v);
                                        if (errors.homeJerseyColor) setErrors(prev => ({ ...prev, homeJerseyColor: "" }));
                                    }}
                                    placeholder={t('account.fields.home_jersey_placeholder', 'Ex: Rouge et Blanc')}
                                    isInvalid={!!errors.homeJerseyColor}
                                    isRequired
                                    aria-label={t('account.fields.home_jersey')}
                                    endContent={<JerseyColorDots colors={homeJerseyColor} size="md" />}
                                />
                                {errors.homeJerseyColor && <p className="text-xs font-bold pl-1 text-danger">{errors.homeJerseyColor}</p>}
                            </div>
                            <div className="space-y-1">
                                <Input
                                    id="acc_away_jersey"
                                    name="acc_away_jersey"
                                    label={t('account.fields.away_jersey', 'Couleur maillot Extérieur')}
                                    variant="bordered"
                                    size="sm"
                                    value={awayJerseyColor}
                                    onValueChange={(v) => {
                                        setAwayJerseyColor(v);
                                        if (errors.awayJerseyColor) setErrors(prev => ({ ...prev, awayJerseyColor: "" }));
                                    }}
                                    placeholder={t('account.fields.away_jersey_placeholder', 'Ex: Bleu')}
                                    isInvalid={!!errors.awayJerseyColor}
                                    isRequired
                                    aria-label={t('account.fields.away_jersey')}
                                    endContent={<JerseyColorDots colors={awayJerseyColor} size="md" />}
                                />
                                {errors.awayJerseyColor && <p className="text-xs font-bold pl-1 text-danger">{errors.awayJerseyColor}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-bold text-default-400 ml-1 mt-2">{t('account.sections.club_location')}</p>
                        <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-default-500">{t('account.fields.current_club')}</span>
                                <span className="font-bold text-primary">{dbUser?.club?.name || t('account.fields.no_club')}</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col gap-3">
                                    {!dbUser?.club_id && (
                                        <p className="text-xs sm:text-sm text-default-600 font-medium bg-default-100 p-2 rounded-lg leading-relaxed border border-default-200 order-1">
                                            💡 {t('matchForm.link_club.search_help', "Pour trouver votre numéro, tapez sur Google : \"SIRET + [Nom exact de votre club]\". Exemple : \"SIRET RC Lens\".")}
                                        </p>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start order-2">
                                        <div className="flex-1 flex flex-col gap-1">
                                            <Input
                                                id="acc_siret"
                                                name="acc_siret"
                                                label={
                                                    <span className="font-bold text-danger text-[0.75rem] sm:text-sm leading-tight">
                                                        SIRET (14 chiffres) ou SIREN (9 chiffres)
                                                    </span>
                                                }
                                                labelPlacement="outside"
                                                variant="bordered"
                                                size="sm"
                                                value={siret}
                                                onValueChange={(v) => {
                                                    const cleaned = v.replace(/\s/g, '');
                                                    if (cleaned.length <= 14) {
                                                        setSiret(v);
                                                        if (errors.siret) setErrors(prev => ({ ...prev, siret: "" }));
                                                    }
                                                }}
                                                placeholder="123 456 789 00012"
                                                isDisabled={!!dbUser?.club_id}
                                                isInvalid={!!errors.siret}
                                                className="w-full max-w-full"
                                                aria-label="Siret (14 chiffres) ou Siren (9 chiffres)"
                                            />
                                            {errors.siret && (
                                                <p className="text-xs font-bold pl-1 animate-shake">{errors.siret}</p>
                                            )}
                                        </div>
                                        {!dbUser?.club_id ? (
                                            <Button
                                                color="primary"
                                                size="sm"
                                                className="h-12 font-bold px-4 w-full sm:w-auto"
                                                onPress={handleLinkSiret}
                                                isLoading={isSaving}
                                            >
                                                {t('account.buttons.validate_club')}
                                            </Button>
                                        ) : (
                                            authUser?.email === 'yannidelattrebalcer.artois@gmail.com' && (
                                                <Button
                                                    color="danger"
                                                    variant="flat"
                                                    size="sm"
                                                    className="h-12 font-bold px-4 w-full sm:w-auto"
                                                    onPress={async () => {
                                                        if (confirm("Détacher le club ? (Admin uniquement)")) {
                                                            try {
                                                                await unlinkClub();
                                                                addToast({ title: "Club détaché", color: "success" });
                                                            } catch (e: any) {
                                                                addToast({ title: e.message, color: "danger" });
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {t('matchForm.buttons.unlink', 'Détacher (Admin)')}
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </div>

                                {dbUser?.club_id && (
                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 mb-2">
                                        <span className="text-default-500">{t('account.fields.main_club')}</span>
                                        <span className="font-bold text-primary">{dbUser?.club?.name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-default-500">{t('account.fields.city')}</span>
                                    <span className="font-medium">{dbUser?.club?.city || dbUser?.location || "Non renseigné"}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-default-500">{t('account.fields.dept')}</span>
                                    <span className="font-medium">{getDept(dbUser?.club?.zip) || "--"}</span>
                                </div>

                                {dbUser?.additional_clubs && dbUser.additional_clubs.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                                        <p className="text-[10px] font-bold text-default-400 tracking-widest mb-1">{t('account.fields.other_clubs')}</p>
                                        {dbUser.additional_clubs.map((s: any, idx: number) => (
                                            <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3">
                                                <div className="flex justify-between items-start gap-2 w-full overflow-hidden">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-black text-white truncate">{s.name || t('account.fields.nameless_club')}</span>
                                                        <div className="flex gap-2 text-[10px] text-default-500 font-bold mt-0.5">
                                                            <span>{s.city}</span>
                                                            <span>•</span>
                                                            <span>{getDept(s.zip)}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-default-400 bg-black/30 px-1.5 py-0.5 rounded shrink-0 border border-white/5">{formatSiret(s.siret)}</span>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Input
                                                        id={`acc_stadium_address_${s.siret}`}
                                                        name={`acc_stadium_address_${s.siret}`}
                                                        label={t('account.fields.stadium_address_for', { club: s.name })}
                                                        placeholder={t('account.fields.stadium_placeholder')}
                                                        variant="bordered"
                                                        size="sm"
                                                        value={additionalStadiumAddresses[s.siret] || ""}
                                                        onValueChange={(v) => {
                                                            setAdditionalStadiumAddresses(prev => ({ ...prev, [s.siret]: v }));
                                                        }}
                                                        aria-label={t('account.fields.stadium_address_for', { club: s.name })}
                                                        classNames={{
                                                            label: "text-[10px] font-bold text-primary-400 tracking-tight",
                                                            input: "text-xs",
                                                            inputWrapper: "h-9 min-h-9"
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {dbUser?.club_id ? (
                                    <div className="mt-6 p-6 bg-red-900/20 border-2 border-red-500/50 rounded-2xl text-center shadow-2xl shadow-red-900/20">
                                        <p className="text-xl font-black text-red-500 tracking-tight mb-2">
                                            {t('support.need_help')}
                                        </p>
                                        <p className="text-base font-bold text-white mb-6">
                                            {t('account.support.description')}
                                        </p>

                                        <Button
                                            as="a"
                                            href="mailto:support@kdufoot.com"
                                            color="danger"
                                            variant="shadow"
                                            size="lg"
                                            className="w-full font-black text-xs sm:text-sm h-12 sm:h-14 shadow-red-500/40 tracking-wider sm:tracking-widest animate-pulse"
                                        >
                                            {t('account.buttons.contact_support')}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20 space-y-2">
                                        <p className="text-sm leading-tight text-warning-700 font-medium">
                                            ⚠️ <strong>{t('warning')} :</strong> {t('account.siret.warning_title')}
                                        </p>
                                        <p className="text-xs sm:text-sm leading-tight text-default-500 italic">
                                            {t('account.siret.warning_desc', 'Pour toute modification ultérieure, vous devrez contacter le support technique.')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full flex md:w-auto flex-col gap-3 mt-8 pt-6 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                            as="a"
                            href={`mailto:support@kdufoot.com?subject=${t('support.technical_issue_subject', 'Problème Technique - Kdufoot')}`}
                            variant="flat"
                            className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-bold flex-1 h-12"
                        >
                            🛠️ {t('support.technical_issue')}
                        </Button>
                        <Button
                            as="a"
                            href={`mailto:support@kdufoot.com?subject=${t('support.other_inquiry_subject', 'Autre Demande - Kdufoot')}`}
                            variant="flat"
                            className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 font-bold flex-1 h-12"
                        >
                            📩 {t('support.other_inquiry')}
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            color="primary"
                            onPress={handleSave}
                            isLoading={isSaving}
                            isDisabled={isDeleting}
                             className="font-bold px-8 shadow-lg shadow-primary/30 w-full sm:w-auto tracking-wider order-1"
                        >
                            {from ? t('account.buttons.save_and_continue') : t('account.buttons.save_changes')}
                        </Button>

                        <Button
                            color="danger"
                            variant="bordered"
                            onPress={handleDeleteAccount}
                            isLoading={isDeleting}
                            isDisabled={isSaving}
                             className="font-bold px-8 w-full sm:w-auto tracking-wider order-2 sm:ml-auto"
                        >
                            {t('account.buttons.delete_account')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
