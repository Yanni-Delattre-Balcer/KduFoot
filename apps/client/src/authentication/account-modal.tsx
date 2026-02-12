import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { useAuth } from "./providers/use-auth";
import { useUser } from "@/hooks/use-user";
import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";

interface AccountModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export const AccountModal = ({ isOpen, onOpenChange }: AccountModalProps) => {
    const { user: authUser } = useAuth();
    const { user: dbUser, updateUser } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [licenseId, setLicenseId] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

    // Sync license_id from dbUser when it loads
    useEffect(() => {
        if (dbUser?.license_id) {
            setLicenseId(dbUser.license_id);
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
                alert("❌ AUCUN VISAGE DÉTECTÉ\n\nLa photo doit contenir un visage humain bien visible. Veuillez choisir une autre photo.");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Face detection error:", error);
            alert("Erreur lors de l'analyse de l'image. Assurez-vous d'utiliser une photo valide.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateUser({
                license_id: licenseId,
                picture: previewUrl || dbUser?.picture || authUser.picture
            });
            alert("Profil mis à jour avec succès !");
            onOpenChange(false);
        } catch (error: any) {
            alert("Erreur lors de la sauvegarde : " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const getDept = (zip?: string | null) => {
        if (!zip || zip.length < 2) return "";
        return zip.substring(0, 2);
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop="blur"
            size="md"
            classNames={{
                base: "bg-background border border-default-100",
                header: "border-b border-default-100",
                footer: "border-t border-default-100 font-bold",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">Mon Compte</ModalHeader>
                        <ModalBody className="py-6">
                            <div className="flex flex-col items-center gap-6">
                                {/* Invisible File Input */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />

                                {/* Profile Picture with Plus Overlay */}
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

                                {/* Mandatory Notice */}
                                <div className="w-full p-3 bg-danger-50 border border-danger-100 rounded-xl text-center">
                                    <p className="text-danger-700 text-xs font-bold uppercase tracking-wider mb-1">⚠️ Action Obligatoire</p>
                                    <p className="text-danger-600 text-sm">
                                        Une photo de profil réelle est **obligatoire** pour valider votre identité d'entraîneur lors des matchs.
                                    </p>
                                </div>

                                <div className="w-full space-y-4">
                                    {/* Identity Section */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-default-400 uppercase ml-1">Identité & Contact</p>
                                        <div className="bg-default-50 p-4 rounded-2xl space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-default-500">Email</span>
                                                <span className="font-medium">{authUser.email}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-default-500">Téléphone</span>
                                                <span className="font-medium">{dbUser?.phone || "Non renseigné"}</span>
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

                                    {/* Club Section */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-default-400 uppercase ml-1">Club & Localisation</p>
                                        <div className="bg-default-50 p-4 rounded-2xl space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-default-500">Club actuel</span>
                                                <span className="font-bold text-primary">{dbUser?.club?.name || "Aucun club lié"}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
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
                            </div>
                        </ModalBody>
                        <ModalFooter className="flex justify-between">
                            <Button color="danger" variant="light" onPress={onClose} className="font-bold">
                                Fermer
                            </Button>
                            <Button
                                color="primary"
                                onPress={handleSave}
                                isLoading={isSaving}
                                className="font-bold px-8 shadow-lg shadow-primary/30"
                            >
                                Enregistrer les modifications
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
