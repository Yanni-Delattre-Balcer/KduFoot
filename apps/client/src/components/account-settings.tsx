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
import { Level, PitchType } from "@/types/match.types";
import { mutate } from "swr";
import { useNavigate, useSearchParams } from "react-router-dom";

const CATEGORIES = Object.values(Category);
const LEVELS = Object.values(Level);
const PITCH_TYPES: PitchType[] = ['Herbe', 'Synthétique', 'Hybride', 'Stabilisé', 'Indoor'];

interface AccountSettingsProps {
    onSaveSuccess?: () => void;
}

export const AccountSettings = ({ onSaveSuccess }: AccountSettingsProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const from = searchParams.get('from');
    const { user: authUser, getAccessToken } = useAuth();
    const { user: dbUser, updateUser, linkClub, unlinkClub, refetch } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [licenseId, setLicenseId] = useState("");
    const [level, setLevel] = useState("");
    const [category, setCategory] = useState("");
    const [pitchType, setPitchType] = useState("");
    const [clubColors, setClubColors] = useState("");
    const [phone, setPhone] = useState("");
    const [siret, setSiret] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

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
            const MODEL_URL = import.meta.env.VITE_FACEAPI_MODELS_URL;
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            ]);
        };
        loadModels();
    }, []);

    // Sync properties from dbUser when it loads
    useEffect(() => {
        if (dbUser) {
            setLicenseId(dbUser.license_id || "");
            setLevel(dbUser.level || "");
            setCategory(dbUser.category || "");
            setPitchType(dbUser.pitch_type || "");
            setClubColors(dbUser.club_colors || "");
            setPhone(formatPhoneNumber(dbUser.phone || ""));
            setSiret(formatSiret(dbUser.siret || ""));
        }
    }, [dbUser]);

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
                console.warn("Aucun visage détecté, mais l'upload continue.");
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
        if (!phone || phone.length < 11) newErrors.phone = "Numéro de téléphone requis";
        if (!category) newErrors.category = "Catégorie requise";
        if (!level) newErrors.level = "Niveau requis";
        if (!pitchType) newErrors.pitchType = "Type de terrain requis";
        const cleanSiret = siret.replace(/\s/g, '').trim();
        if (!dbUser?.club_id && (!siret || (cleanSiret.length !== 14 && cleanSiret.length !== 9))) {
            newErrors.siret = t('matchForm.alerts.siret_length', "Numéro SIRET (14 chiffres) ou SIREN (9 chiffres) requis");
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            addToast({ title: t('error.title'), description: "Veuillez remplir tous les champs obligatoires", variant: 'flat', color: 'danger' });
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
                license_id: licenseId,
                level,
                category,
                pitch_type: pitchType,
                club_colors: clubColors,
                phone: phone,
                picture: previewUrl || dbUser?.picture || authUser.picture
            });

            await getAccessToken({ cacheMode: 'off' } as any);
            await refetch();
            await mutate('/api/me/context');

            addToast({ title: t('success', 'Succès'), description: t('accountModal.alerts.update_success', 'Profil mis à jour avec succès'), variant: 'flat', color: 'success' });

            if (onSaveSuccess) onSaveSuccess();

            // Systematic redirection to 'from' or defaults to '/matches'
            navigate(from || '/matches');
        } catch (error: any) {
            console.error("Update profile error:", error);
            addToast({ title: t('error.title'), description: error.message || t('accountModal.alerts.update_error', 'Erreur de mise à jour'), variant: 'flat', color: 'danger' });
        } finally {
            setIsSaving(false);
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
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest -mb-4 animate-pulse">
                    Le mieux à faire c'était de mettre le logo du club
                </p>

                <div className="relative group cursor-pointer z-10" onClick={handleAvatarClick}>
                    <Image
                        src={previewUrl || dbUser?.picture || authUser.picture}
                        className={`w-24 h-24 rounded-full object-cover border-4 border-primary/20 ${isAnalyzing ? 'opacity-50' : ''}`}
                        alt={authUser.name}
                    />
                    <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-lg border-2 border-white z-20">
                        {isAnalyzing ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-15">
                        <span className="text-white text-xs font-bold">{isAnalyzing ? 'Analyse...' : 'Changer'}</span>
                    </div>
                </div>

                <div className="text-center w-full">
                    <h3 className="text-2xl font-bold">{authUser.name}</h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <Chip
                            size="sm"
                            color={dbUser?.subscription === 'Free' ? 'default' : 'primary'}
                            variant="flat"
                            className="font-black px-4 uppercase tracking-tighter"
                        >
                            {dbUser?.subscription ? `Abonnement ${dbUser.subscription}` : 'Compte Gratuit'}
                        </Chip>
                    </div>
                </div>

                <div className="w-full space-y-8">
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-default-400 uppercase ml-1">Identité & Contact</p>
                        <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-default-500">Email</span>
                                <span className="font-medium">{authUser.email}</span>
                            </div>
                            <div className="space-y-1">
                                <Input
                                    label="Téléphone"
                                    variant="bordered"
                                    size="sm"
                                    value={phone}
                                    onValueChange={(v) => {
                                        handlePhoneChange(v);
                                        if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
                                    }}
                                    placeholder="+33 6 12 34 56 78"
                                    isInvalid={!!errors.phone}
                                />
                                {errors.phone && <p className="text-[10px] text-danger font-bold pl-1">{errors.phone}</p>}
                            </div>
                            <Input
                                label="Numéro de licence"
                                variant="bordered"
                                size="sm"
                                value={licenseId}
                                onValueChange={setLicenseId}
                                placeholder="Saisir votre numéro"
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-default-400 uppercase ml-1 mt-2">Profil Sportif (Requis pour créer des annonces)</p>
                        <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Select
                                    label="Catégorie"
                                    variant="bordered"
                                    size="sm"
                                    selectedKeys={category ? [category] : []}
                                    onChange={(e) => {
                                        setCategory(e.target.value);
                                        if (errors.category) setErrors(prev => ({ ...prev, category: "" }));
                                    }}
                                    placeholder="Choisir..."
                                    isInvalid={!!errors.category}
                                >
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} textValue={t(`enums.category.${cat}`)}>
                                            {t(`enums.category.${cat}`)}
                                        </SelectItem>
                                    ))}
                                </Select>
                                {errors.category && <p className="text-[10px] text-danger font-bold pl-1">{errors.category}</p>}
                            </div>
                            <div className="space-y-1">
                                <Select
                                    label="Niveau"
                                    variant="bordered"
                                    size="sm"
                                    selectedKeys={level ? [level] : []}
                                    onChange={(e) => {
                                        setLevel(e.target.value);
                                        if (errors.level) setErrors(prev => ({ ...prev, level: "" }));
                                    }}
                                    placeholder="Choisir..."
                                    isInvalid={!!errors.level}
                                >
                                    {LEVELS.map((lvl) => (
                                        <SelectItem key={lvl} textValue={t(`enums.level.${lvl}`)}>
                                            {t(`enums.level.${lvl}`)}
                                        </SelectItem>
                                    ))}
                                </Select>
                                {errors.level && <p className="text-[10px] text-danger font-bold pl-1">{errors.level}</p>}
                            </div>
                            <div className="space-y-1">
                                <Select
                                    label="Terrain habituel"
                                    variant="bordered"
                                    size="sm"
                                    selectedKeys={pitchType ? [pitchType] : []}
                                    onChange={(e) => {
                                        setPitchType(e.target.value);
                                        if (errors.pitchType) setErrors(prev => ({ ...prev, pitchType: "" }));
                                    }}
                                    placeholder="Choisir..."
                                    isInvalid={!!errors.pitchType}
                                >
                                    {PITCH_TYPES.map((type) => (
                                        <SelectItem key={type} textValue={t(`enums.pitch.${type}`)}>
                                            {t(`enums.pitch.${type}`)}
                                        </SelectItem>
                                    ))}
                                </Select>
                                {errors.pitchType && <p className="text-[10px] text-danger font-bold pl-1">{errors.pitchType}</p>}
                            </div>
                            <Input
                                label="Couleur des maillots"
                                variant="bordered"
                                size="sm"
                                value={clubColors}
                                onValueChange={setClubColors}
                                placeholder="Rouge et Noir..."
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-default-400 uppercase ml-1 mt-2">Club & Localisation</p>
                        <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-default-500">Club actuel</span>
                                <span className="font-bold text-primary">{dbUser?.club?.name || "Aucun club lié"}</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                                    <div className="flex-1 flex flex-col gap-1">
                                        <Input
                                            label="Numéro SIRET (14 chiffres) ou SIREN (9 chiffres)"
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
                                            className="w-full"
                                        />
                                        {errors.siret ? (
                                            <p className="text-[10px] text-danger font-bold pl-1 animate-shake">{errors.siret}</p>
                                        ) : (
                                            <p className="text-[10px] text-default-400 pl-1 leading-relaxed">
                                                {t('matchForm.link_club.search_help', "Pour trouver votre numéro, tapez sur Google : \"SIRET + [Nom exact de votre club]\". Exemple : \"SIRET RC Lens\".")}
                                            </p>
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
                                            VALIDER MON CLUB
                                        </Button>
                                    ) : (
                                        authUser?.email === 'yannidelattrebalcer.artois@gmail.com' && (
                                            <Button
                                                color="danger"
                                                variant="flat"
                                                size="sm"
                                                className="h-12 font-bold px-4 w-full sm:w-auto uppercase"
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

                                <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 space-y-2">
                                    <p className="text-[11px] leading-tight text-warning-700 font-medium">
                                        ⚠️ <strong>Attention :</strong> Une fois le SIRET validé et le club lié à votre compte, cette action est <strong>irréversible</strong>.
                                    </p>
                                    <p className="text-[10px] leading-tight text-default-500 italic">
                                        Pour toute modification ultérieure, vous devrez contacter le support technique.
                                    </p>
                                </div>

                                <Button
                                    as="a"
                                    href="mailto:support@kdufoot.com"
                                    variant="flat"
                                    color="warning"
                                    size="sm"
                                    className="w-full font-bold text-[11px] h-9"
                                >
                                    📩 Demande d'aide
                                </Button>
                            </div>

                            <div className="flex justify-between items-center text-sm pt-2">
                                <span className="text-default-500">Ville</span>
                                <span className="font-medium">{dbUser?.club?.city || dbUser?.location || "Non renseigné"}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-default-500">Département</span>
                                <span className="font-medium">{getDept(dbUser?.club?.zip) || "--"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full flex justify-center mt-6">
                    <Button
                        color="primary"
                        onPress={handleSave}
                        isLoading={isSaving}
                        className="font-bold px-8 shadow-lg shadow-primary/30 w-full sm:w-auto"
                    >
                        Enregistrer les modifications
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
