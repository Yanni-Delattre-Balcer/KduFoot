import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useMatch } from '@/hooks/use-matches';
import { useAuth, useUser } from "@/authentication";
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { useWelcomeGateway } from '@/contexts/welcome-gateway-context';
import { Chip } from "@heroui/chip";
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Image } from "@heroui/image";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import DataWall from '@/components/data-wall';
import { addToast } from '@heroui/toast';
import { JerseyColorDots } from '@/components/jersey-color-dots';

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr.replace(':', 'h');
};

const InfoItem = ({ icon, label, value, color }: { icon: string, label: string, value: string, color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default' }) => {
    const colorClasses = {
        primary: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        secondary: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        default: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
    };

    // Regex to remove emojis from the value if we already have a dedicated icon
    const cleanedValue = value.replace(/[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}]/gu, '').replace(/^\s+|\s+$/g, '');

    return (
        <div className={`p-4 rounded-[1.5rem] border ${colorClasses[color]} flex flex-col justify-between gap-3 transition-all hover:scale-[1.02] cursor-default h-full bg-linear-to-b from-transparent to-black/5`}>
            <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center text-xl shadow-inner">
                    {icon}
                </div>
                <span className="text-[9px] uppercase font-black tracking-[0.2em] opacity-40">{label}</span>
            </div>
            <p className="text-white font-black uppercase text-xs sm:text-sm leading-tight break-words">
                {cleanedValue}
            </p>
        </div>
    );
};

export default function MatchDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, profileComplete, isAdmin, blockUser } = useUser();
    const { isAuthenticated } = useAuth();
    const { openGateway } = useWelcomeGateway();
    const isMasked = !isAuthenticated || !profileComplete;
    const { match, isLoading, isError, contactMatch, deleteMatch, adminDeleteMatch, cancelMatchContact, updateRequestStatus, closeRegistrations } = useMatch(id || null);
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure();
    const { isOpen: isCancelOpen, onOpen: onCancelOpen, onOpenChange: onCancelOpenChange } = useDisclosure();
    const { isOpen: isAdminDeleteOpen, onOpen: onAdminDeleteOpen, onOpenChange: onAdminDeleteOpenChange } = useDisclosure();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isAdminDeleting, setIsAdminDeleting] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const { isOpen: isBlockOpen, onOpen: onBlockOpen, onOpenChange: onBlockOpenChange } = useDisclosure();
    const { isOpen: isCloseRegOpen, onOpen: onCloseRegOpen, onOpenChange: onCloseRegOpenChange } = useDisclosure();
    const { isOpen: isCancelAcceptedOpen, onOpen: onCancelAcceptedOpen, onOpenChange: onCancelAcceptedOpenChange } = useDisclosure();

    if (isLoading) {
        return (
            <DefaultLayout>
                <div className="flex justify-center items-center h-[50vh]">
                    <Spinner label={t('loading')} />
                </div>
            </DefaultLayout>
        );
    }

    if (isError || !match) {
        return (
            <DefaultLayout>
                <div className="flex flex-col items-center justify-center gap-4 h-[50vh]">
                    <h1 className="text-2xl font-bold text-danger">{t('error.not_found')}</h1>
                    <Button as={Link} to="/matches" color="primary">
                        {t('back_to_list')}
                    </Button>
                </div>
            </DefaultLayout>
        );
    }

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteMatch();
            addToast({ title: "Match supprimé", description: "L'annonce a été retirée avec succès", color: "success" });
            onDeleteOpenChange(); // Close modal on success
            navigate('/matches');
        } catch (error) {
            console.error("Failed to delete match", error);
            addToast({ title: "Erreur", description: t('error.delete_failed', 'Erreur lors de la suppression du match'), color: "danger" });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelRequest = async () => {
        if (!user) return;
        setIsCancelling(true);
        try {
            await cancelMatchContact(user.id);
            onCancelOpenChange();
        } catch (error: any) {
            console.error("Failed to cancel request", error);
            addToast({ title: "Erreur", description: error.message || "Erreur lors de l'annulation", color: "danger" });
        } finally {
            setIsCancelling(false);
        }
    };

    const handleAdminDelete = async () => {
        setIsAdminDeleting(true);
        try {
            await adminDeleteMatch();
            onAdminDeleteOpenChange();
            navigate('/matches');
        } catch (error: any) {
            console.error("Admin delete failed", error);
            addToast({ title: "Erreur", description: error.message || "Erreur lors de la suppression admin", color: "danger" });
        } finally {
            setIsAdminDeleting(false);
        }
    };

    const handleBlockUser = async () => {
        if (!match.owner_id) return;
        setIsBlocking(true);
        try {
            await blockUser(match.owner_id, true);
            addToast({ title: "Succès", description: "Utilisateur bloqué avec succès", variant: 'flat', color: 'success' });
        } catch (error: any) {
            console.error("Blocking failed", error);
            addToast({ title: "Erreur", description: error.message || "Erreur lors du blocage", variant: 'flat', color: 'danger' });
        } finally {
            setIsBlocking(false);
        }
    };

    // Parse Gender from notes if present
    const genderMatch = match.notes?.match(/Genre: (.*)(\n|$)/);
    // Default to 'Mixte' if not specified or explicitly 'Non spécifié'
    let gender = genderMatch ? genderMatch[1].trim() : 'Mixte';
    // Remove technical prefix if present (e.g. from legacy data or misformatted inputs)
    if (gender.startsWith('enums.gender.')) {
        gender = gender.replace('enums.gender.', '');
    }
    // Final fallback/normalization
    if (!gender || gender.trim() === '' || gender === 'Non spécifié') gender = 'Mixte';
    const cleanNotes = match.notes?.replace(/Genre: .*(\n|$)/, '').trim();

    return (
        <DefaultLayout>
            <DataWall>
                <div className="container mx-auto max-w-7xl p-6 space-y-8 animate-appearance-in pb-24">
                    {/* Header with Back Button */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <Button
                            variant="light"
                            startContent={
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                                </svg>
                            }
                            onPress={() => navigate('/matches')}
                            className="font-medium"
                        >
                            {t('back_to_list')}
                        </Button>

                        {user?.id === match.owner_id && (
                            <div className="flex gap-2">
                                <Button as={Link} to={`/matches/${id}/edit`} color="primary" variant="flat" startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                }>
                                    {t('edit')}
                                </Button>
                                <Button color="danger" variant="flat" startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                } onPress={onDeleteOpen}>
                                    {t('delete')}
                                </Button>
                            </div>
                        )}

                        {isAdmin && user?.id !== match.owner_id && (
                            <div className="flex flex-col sm:flex-row gap-2 bg-danger/5 p-2 rounded-2xl border border-danger/20 animate-pulse">
                                <span className="text-xs sm:text-sm font-bold text-danger uppercase px-2 py-1">Outils Modération (ADMIN)</span>
                                <div className="flex gap-2">
                                    <Button
                                        color="danger"
                                        size="sm"
                                        variant="solid"
                                        className="font-black uppercase tracking-tighter shadow-lg shadow-danger/20"
                                        startContent={
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5 0l.5 8.5a.75.75 0 1 0 1.5 0l-.5-8.5Zm4.335 0a.75.75 0 1 0-1.5 0l-.5 8.5a.75.75 0 1 0 1.5 0l.5-8.5Z" clipRule="evenodd" />
                                            </svg>
                                        }
                                        onPress={onAdminDeleteOpen}
                                    >
                                        Supprimer l'annonce
                                    </Button>
                                    <Button
                                        color="danger"
                                        size="sm"
                                        variant="bordered"
                                        className="font-black uppercase tracking-tighter"
                                        isLoading={isBlocking}
                                        startContent={
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path fillRule="evenodd" d="M12 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5ZM5.636 4.136a.75.75 0 0 1 1.06 0l1.592 1.591a.75.75 0 0 1-1.061 1.06L5.636 5.197a.75.75 0 0 1 0-1.061Zm12.728 0a.75.75 0 0 1 0 1.06l-1.591 1.592a.75.75 0 0 1-1.06-1.061l1.592-1.591a.75.75 0 0 1 1.06 0ZM12 5.25a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM3 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm15 0a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25A.75.75 0 0 1 18 12ZM6.697 18.364a.75.75 0 0 1 1.06 0l1.591 1.591a.75.75 0 1 1-1.06 1.061l-1.591-1.592a.75.75 0 0 1 0-1.06Zm10.606 0a.75.75 0 0 1 0 1.06l-1.592 1.591a.75.75 0 1 1-1.06-1.06l1.591-1.592a.75.75 0 0 1 1.06 0ZM12 18.75a.75.75 0 0 1 .75.75V21.75a.75.75 0 0 1-1.5 0V19.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                            </svg>
                                        }
                                        onPress={onBlockOpen}
                                    >
                                        Bloquer l'utilisateur
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Details Section */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Premium Match Header Card */}
                            <Card className="shadow-2xl border-none bg-linear-to-br from-[#1c1c1f] to-[#141416] overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                                <CardBody className="p-8 relative">
                                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                                        {/* Club Logo / Big Icon */}
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl group-hover:bg-primary/30 transition-all" />
                                            {match.club?.logo_url ? (
                                                <div className="relative w-32 h-32 bg-[#232120] rounded-3xl p-4 border border-white/5 flex items-center justify-center shadow-2xl">
                                                    <Image
                                                        alt={match.club.name}
                                                        src={match.club.logo_url}
                                                        width={100}
                                                        height={100}
                                                        className="object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="relative w-32 h-32 bg-linear-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center shadow-2xl">
                                                    <span className="text-5xl font-black text-white">{match.club?.name?.charAt(0)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                                <Chip size="sm" color={match.type === 'tournament' ? 'warning' : 'primary'} variant="shadow" className="font-black uppercase tracking-tighter shadow-lg shadow-primary/20">
                                                    {match.type === 'tournament' ? '🏆 TOURNOI' : '⚽ MATCH AMICAL'}
                                                </Chip>
                                                {match.status === 'found' && (
                                                    <Chip size="sm" color="success" variant="shadow" className="font-black uppercase tracking-tighter">COMPLET</Chip>
                                                )}
                                            </div>

                                            <div>
                                                <h1 className="text-3xl md:text-4xl font-black text-white leading-none tracking-tighter mb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                                                    {isMasked ? 'MATCH MASQUÉ' : (match.type === 'tournament' ? match.name : match.club?.name)}
                                                </h1>
                                                <p className="flex items-center justify-center md:justify-start gap-2 text-default-400 font-bold uppercase tracking-widest text-xs">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
                                                        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                                    </svg>
                                                    {isMasked ? 'VILLE MASQUÉE' : `${match.location_city || match.club?.city} (${match.location_zip || match.club?.zip})`}
                                                </p>
                                            </div>

                                            {!isMasked && (
                                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                                    <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-3">
                                                        <p className="text-[10px] text-default-400 uppercase font-black tracking-widest mb-1">Localisation précise</p>
                                                        <p className="text-white font-bold text-sm truncate">{match.location_address || match.club?.address}</p>
                                                    </div>
                                                    <Button
                                                        variant="shadow"
                                                        color="primary"
                                                        className="font-black uppercase tracking-tighter h-auto py-3 px-6 rounded-2xl"
                                                        as="a"
                                                        href={(match.club?.latitude && match.club?.longitude && (!match.location_address || match.location_address === match.club.address))
                                                            ? `https://www.google.com/maps/dir/?api=1&destination=${match.club.latitude},${match.club.longitude}`
                                                            : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${match.location_address || match.club?.address || ''}, ${match.location_city || match.club?.city || ''}`.trim().replace(/^,/, '').trim())}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        startContent={<span className="text-xl">📍</span>}
                                                    >
                                                        Itinéraire
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Info Grid Component */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <InfoItem 
                                    icon="⚽" 
                                    label="Catégorie" 
                                    value={t(`enums.category.${match.category}`)} 
                                    color="primary" 
                                />
                                <InfoItem 
                                    icon="⭐" 
                                    label="Niveau" 
                                    value={match.level ? t(`enums.level.${match.level}`) : "Non spécifié"} 
                                    color="secondary" 
                                />
                                <InfoItem 
                                    icon="🏟️" 
                                    label="Terrain" 
                                    value={match.pitch_type ? t(`enums.pitch.${match.pitch_type}`) : "Toutes surfaces"} 
                                    color="success" 
                                />
                                <InfoItem 
                                    icon="👥" 
                                    label="Format" 
                                    value={t(`enums.format.${match.format}`, match.format)} 
                                    color="warning" 
                                />
                                <InfoItem 
                                    icon="📅" 
                                    label="Date" 
                                    value={new Date(match.match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} 
                                    color="danger" 
                                />
                                <InfoItem 
                                    icon="🕒" 
                                    label="Horaire" 
                                    value={`${formatTime(match.match_time)}${match.match_end_time ? ` - ${formatTime(match.match_end_time)}` : ''}`} 
                                    color="primary" 
                                />
                                <InfoItem 
                                    icon={match.venue === 'Domicile' ? "🏠" : "🚗"} 
                                    label="Lieu" 
                                    value={t(`enums.venue.${match.venue}`)} 
                                    color="secondary" 
                                />
                                <InfoItem 
                                    icon="⚤" 
                                    label="Genre" 
                                    value={t(`enums.gender.${gender}`)} 
                                    color="default" 
                                />
                            </div>

                            {/* Additional Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {match.jersey_color && (
                                    <div className="bg-[#1c1c1f] rounded-3xl p-6 border border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-default-400 uppercase font-black tracking-widest mb-1">Couleurs de maillot</p>
                                            <p className="text-white font-bold uppercase">{t('matchForm.labels.jersey_color', 'Principal')}</p>
                                        </div>
                                        <JerseyColorDots colors={match.jersey_color} size="lg" />
                                    </div>
                                )}
                                {match.type === 'tournament' && (
                                    <div className="bg-[#1c1c1f] rounded-3xl p-6 border border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-default-400 uppercase font-black tracking-widest mb-1">Inscriptions</p>
                                            <p className="text-white font-bold">{match.accepted_count || 0} / {match.max_teams} Équipes confirmées</p>
                                        </div>
                                        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center font-black text-xs text-primary">
                                            {Math.round(((match.accepted_count || 0) / (match.max_teams || 1)) * 100)}%
                                        </div>
                                    </div>
                                )}
                            </div>

                            {cleanNotes && (
                                <div className="bg-linear-to-br from-amber-500/10 to-orange-500/5 rounded-3xl p-8 border border-amber-500/20">
                                    <h3 className="font-black text-xl text-amber-500 uppercase tracking-tighter mb-4 flex items-center gap-3">
                                        <span className="text-2xl">📝</span> {t('matchForm.labels.notes', 'Notes & Instructions')}
                                    </h3>
                                    <div className="text-default-300 font-medium leading-relaxed italic text-lg opacity-80 border-l-2 border-amber-500/30 pl-6">
                                        {cleanNotes}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar: Club & Contact */}
                        <div className="flex flex-col gap-4">
                            {/* Club Organizer Card */}
                            <Card className="bg-[#1c1c1f] shadow-2xl border-none overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-primary/10 transition-all" />
                                <CardHeader className="font-black text-center border-b border-white/5 justify-center pb-4 text-white uppercase tracking-widest text-xs opacity-60">Club Organisateur</CardHeader>
                                <CardBody className="flex flex-col items-center gap-6 py-8 relative">
                                    {match.club?.logo_url ? (
                                        <div className="w-28 h-28 bg-[#111] rounded-[2rem] p-4 border border-white/5 flex items-center justify-center shadow-inner">
                                            <Image
                                                alt={match.club.name}
                                                src={match.club.logo_url}
                                                width={100}
                                                height={100}
                                                className="object-contain drop-shadow-2xl"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-28 h-28 bg-linear-to-br from-zinc-700 to-zinc-900 rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/10">
                                            <span className="text-4xl font-black text-white">{match.club?.name?.charAt(0)}</span>
                                        </div>
                                    )}
                                    <div className="text-center space-y-1">
                                        <h3 className="font-black text-2xl text-white leading-tight uppercase tracking-tighter">{isMasked ? 'CLUB MASQUÉ' : match.club?.name}</h3>
                                        <p className="text-primary font-black uppercase text-sm tracking-widest">{isMasked ? 'VILLE MASQUÉE' : match.club?.city}</p>
                                        
                                        {!isMasked && (match.club?.home_jersey_color || match.club?.away_jersey_color) && (
                                            <div className="flex justify-center gap-4 pt-4 mt-4 border-t border-white/5">
                                                {match.club.home_jersey_color && (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">Home</span>
                                                        <JerseyColorDots colors={match.club.home_jersey_color} size="sm" />
                                                    </div>
                                                )}
                                                {match.club.away_jersey_color && (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">Away</span>
                                                        <JerseyColorDots colors={match.club.away_jersey_color} size="sm" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>

                            <Card className="shadow-2xl border-none bg-linear-to-br from-primary/10 to-secondary/10 overflow-hidden">
                                <CardHeader className="font-black bg-primary/20 text-white justify-center uppercase tracking-widest text-xs py-3 border-b border-white/5">Action Requise</CardHeader>
                                <CardBody className="gap-6 p-8">
                                    {user?.id === match.owner_id ? (
                                        <div className="text-center space-y-4">
                                            {match.contacts?.some(c => c.status === 'accepted') ? (
                                                <div className="bg-emerald-500/20 border-2 border-emerald-500/30 p-5 rounded-[2rem] space-y-4 mb-4 animate-appearance-in">
                                                    <p className="text-emerald-400 font-black text-center uppercase text-sm tracking-widest flex items-center justify-center gap-2">
                                                        Confirmed ✅
                                                    </p>
                                                    <Button
                                                        color="danger"
                                                        variant="shadow"
                                                        className="w-full font-black uppercase tracking-tighter h-12 rounded-2xl shadow-lg shadow-rose-500/20"
                                                        onPress={onCancelAcceptedOpen}
                                                    >
                                                        {match.type === 'tournament' ? 'Annuler le tournoi' : 'Annuler le duel'}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <p className="text-default-400 text-sm font-bold uppercase tracking-wide opacity-60">Gestion de l'organisateur</p>
                                            )}
                                            <Button 
                                                variant="shadow" 
                                                className="w-full font-black uppercase tracking-tighter h-14 rounded-2xl bg-white text-black shadow-xl" 
                                                as={Link} 
                                                to={`/matches/${id}/edit`}
                                                startContent={<span className="text-xl">✍️</span>}
                                            >
                                                Modifier l'annonce
                                            </Button>
                                            {match.type === 'tournament' && match.status === 'active' && (
                                                <Button
                                                    color="success"
                                                    variant="shadow"
                                                    className="w-full font-black uppercase tracking-tighter h-14 rounded-2xl shadow-lg shadow-emerald-500/20"
                                                    onPress={onCloseRegOpen}
                                                    startContent={<span className="text-xl">🔒</span>}
                                                >
                                                    Clôturer les inscriptions
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {(() => {
                                                const isProfileIncomplete = !user?.level || !user?.category || !user?.pitch_type || !user?.club_colors;
                                                return (
                                                    <>
                                                        <p className="text-default-300 text-sm text-center">Vous souhaitez faire participer votre équipe ?</p>

                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                            <Button
                                                                color="warning"
                                                                variant="flat"
                                                                className="font-black uppercase tracking-tighter h-12 border border-warning/20 shadow-lg shadow-warning/10"
                                                                onPress={() => {
                                                                    if (isMasked) {
                                                                        openGateway("Veuillez compléter votre profil pour effectuer cette action");
                                                                        return;
                                                                    }
                                                                    window.location.href = `tel:${match.phone}`;
                                                                    setTimeout(async () => {
                                                                        if (user?.club_id && !match.contacts?.some((c: any) => c.user_id === user.id)) {
                                                                            try {
                                                                                await contactMatch({ message: "A porté de l'intérêt en appelant" });
                                                                            } catch (e) {
                                                                                console.error(e);
                                                                            }
                                                                        }
                                                                    }, 1000);
                                                                }}
                                                            >
                                                                📞 Appeler
                                                            </Button>
                                                            <Button
                                                                color="secondary"
                                                                variant="flat"
                                                                className="font-black uppercase tracking-tighter h-12 border border-secondary/20 shadow-lg shadow-secondary/10"
                                                                onPress={() => {
                                                                    if (isMasked) {
                                                                        openGateway("Veuillez compléter votre profil pour effectuer cette action");
                                                                        return;
                                                                    }
                                                                    window.location.href = `mailto:${match.email}`;
                                                                    setTimeout(async () => {
                                                                        if (user?.club_id && !match.contacts?.some((c: any) => c.user_id === user.id)) {
                                                                            try {
                                                                                await contactMatch({ message: "A porté de l'intérêt en envoyant un mail" });
                                                                            } catch (e) {
                                                                                console.error(e);
                                                                            }
                                                                        }
                                                                    }, 1000);
                                                                }}
                                                            >
                                                                ✉️ Email
                                                            </Button>
                                                        </div>
                                                        <div className="relative flex items-center py-2">
                                                            <div className="flex-1 border-t border-default-100/10"></div>
                                                            <span className="shrink-0 px-2 text-default-500 text-xs font-bold uppercase tracking-widest">ou</span>
                                                            <div className="flex-1 border-t border-default-100/10"></div>
                                                        </div>

                                                        {isProfileIncomplete && (
                                                            <div className="bg-danger/10 border border-danger/20 p-3 rounded-xl mb-2 animate-appearance-in">
                                                                <p className="text-danger text-xs sm:text-sm font-bold text-center uppercase">
                                                                    {t('profile_incomplete', 'Complète ton profil club pour postuler à ce match')}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {match.contacts?.some(c => c.user_id === user?.id && c.message === "A porté de l'intérêt en envoyant une demande") ? (
                                                            <Button
                                                                color="danger"
                                                                variant="shadow"
                                                                className="w-full font-black uppercase tracking-tighter h-12 shadow-lg shadow-danger/20 border border-danger/20"
                                                                onPress={onCancelOpen}
                                                            >
                                                                🗑️ Annuler ma demande
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                color={isProfileIncomplete ? "default" : "primary"}
                                                                className="w-full font-black uppercase tracking-tighter h-12 shadow-lg"
                                                                onPress={async () => {
                                                                    if (isMasked) {
                                                                        openGateway("Veuillez compléter votre profil pour effectuer cette action");
                                                                        return;
                                                                    }
                                                                    if (!user) {
                                                                        openGateway("Veuillez vous connecter pour envoyer une demande.");
                                                                        return;
                                                                    }
                                                                    if (!user.club_id) {
                                                                        addToast({ title: "Profil incomplet", description: "Veuillez lier votre club pour envoyer une demande.", color: "warning", timeout: 5000 });
                                                                        return;
                                                                    }
                                                                    try {
                                                                        await contactMatch({ message: "A porté de l'intérêt en envoyant une demande" });
                                                                        addToast({ title: "Succès", description: "Demande envoyée avec succès !", variant: 'flat', color: 'success', timeout: 5000 });
                                                                    } catch (e: any) {
                                                                        addToast({ title: "Erreur", description: e.message || "Erreur lors de l'envoi", variant: 'flat', color: 'danger', timeout: 5000 });
                                                                    }
                                                                }}
                                                                isDisabled={isProfileIncomplete && !isMasked}
                                                            >
                                                                {match.type === 'tournament' ? 'POSTULER AU TOURNOI' : 'ENVOYER UNE DEMANDE'}
                                                            </Button>
                                                        )}
                                                    </>
                                                );
                                            })()}

                                            {match.contacts?.find(c => c.user_id === user?.id)?.status === 'accepted' && (
                                                <div className="mt-4 p-4 bg-success-500/10 border border-success-500/20 rounded-xl space-y-3 animate-appearance-in">
                                                    <p className="text-success font-black text-center uppercase text-sm tracking-tighter">
                                                        {match.type === 'tournament' ? 'Tournoi' : 'Duel'} Confirmé ! ✅
                                                    </p>
                                                    <div className="pt-2 border-t border-success-500/10 space-y-2">
                                                        <div className="flex items-center gap-2 text-white text-sm">
                                                            📞 {match.phone}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-white text-sm">
                                                            ✉️ {match.email}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        color="danger"
                                                        variant="flat"
                                                        className="w-full font-bold text-xs sm:text-sm h-9 mt-4"
                                                        onPress={onCancelOpen}
                                                    >
                                                        {match.type === 'tournament' ? 'Se désister du tournoi' : 'Se désister du match'}
                                                    </Button>
                                                </div>
                                            )}
                                            {match.contacts?.find(c => c.user_id === user?.id)?.status === 'refused' && (
                                                <div className="mt-4 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl">
                                                    <p className="text-danger font-black text-center uppercase text-sm tracking-tighter">Demande Refusée</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardBody>
                            </Card>
                        </div>

                        {/* Interaction / Tracking Section */}
                        <div className="lg:col-span-3 mt-12">
                            <div className="bg-linear-to-br from-[#1c1c1f] to-[#141416] rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary via-secondary to-primary opacity-50" />
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                    <div className="space-y-1 text-center md:text-left">
                                        <h2 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3 tracking-tighter uppercase">
                                            <span className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-primary/10">🤝</span>
                                            Suivi des Contacts
                                        </h2>
                                        <p className="text-default-500 font-medium opacity-80 pl-0 md:pl-12">
                                            Dépêchez-vous de candidater pour ce match, il y a déjà {match.contacts?.length || 0} club{(match.contacts?.length || 0) > 1 ? 's' : ''} qui ont candidaté ou porté de l'intérêt pour ce match.
                                        </p>
                                    </div>
                                    <Chip size="lg" variant="shadow" color="primary" className="font-black px-6 self-center md:self-auto shadow-lg shadow-primary/20">
                                        {match.contacts?.length || 0} INTÉRÊT{(match.contacts?.length || 0) > 1 ? 'S' : ''}
                                    </Chip>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {match.contacts && match.contacts.length > 0 ? (
                                        match.contacts.map((contact, index) => {
                                            const isActionable = user?.id === match.owner_id && contact.message === "A porté de l'intérêt en envoyant une demande";
                                            const statusConfig = {
                                                accepted: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/5', color: 'text-emerald-400', icon: '✅' },
                                                refused: { border: 'border-rose-500/30', bg: 'bg-rose-500/5', color: 'text-rose-400', icon: '❌' },
                                                withdrawn: { border: 'border-zinc-500/20', bg: 'bg-zinc-500/5', color: 'text-zinc-500', icon: '🗑️' },
                                                pending: { border: 'border-primary/30', bg: 'bg-primary/5', color: 'text-primary', icon: '⏳' }
                                            }[contact.status];

                                            return (
                                                <Card
                                                    key={index}
                                                    isPressable={isActionable}
                                                    onPress={() => isActionable && navigate('/dashboard')}
                                                    className={`border-2 ${statusConfig.border} ${statusConfig.bg} rounded-3xl transition-all ${isActionable ? 'hover:scale-[1.03] hover:border-primary shadow-xl shadow-primary/5 cursor-pointer' : ''}`}
                                                >
                                                    <CardBody className="p-6 gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-14 h-14 rounded-2xl bg-[#000] border border-white/10 flex items-center justify-center text-2xl shadow-inner relative`}>
                                                                {contact.club_logo ? (
                                                                    <Image src={contact.club_logo} className="w-10 h-10 object-contain" />
                                                                ) : contact.club_name?.charAt(0) || '?'}
                                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#111] border border-white/10 flex items-center justify-center text-xs">
                                                                    {statusConfig.icon}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                                <p className="font-black text-white uppercase tracking-tighter leading-tight mb-1 overflow-x-auto whitespace-nowrap scrollbar-hide">{contact.club_name || 'Club intéressé'}</p>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <p className="text-[10px] text-default-500 font-bold uppercase tracking-widest">{new Date(contact.contacted_at).toLocaleDateString()}</p>
                                                                    {contact.message && (
                                                                        <p className="text-[10px] text-primary font-black uppercase tracking-tighter italic opacity-80">{contact.message}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {contact.status !== 'pending' && (
                                                            <div className={`py-1.5 px-3 rounded-xl border border-current/20 font-black text-[10px] uppercase text-center tracking-widest ${statusConfig.color}`}>
                                                                {contact.status === 'accepted' ? 'ÉQUIPE INSCRITE' : contact.status === 'refused' ? 'DEMANDE REFUSÉE' : 'DÉSISTEMENT'}
                                                            </div>
                                                        )}
                                                        
                                                        {isActionable && (
                                                            <Button size="sm" color="primary" variant="shadow" className="font-black uppercase tracking-tighter w-full rounded-xl">
                                                                Voir la demande
                                                            </Button>
                                                        )}
                                                    </CardBody>
                                                </Card>
                                            )
                                        })
                                    ) : (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white/5 rounded-[2rem] border border-dashed border-white/10 opacity-60">
                                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-3xl mb-4">🌑</div>
                                            <p className="text-default-400 font-black uppercase tracking-widest text-sm">Aucune candidature pour le moment</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cancel Request Confirmation Modal */}
                    <Modal isOpen={isCancelOpen} onOpenChange={onCancelOpenChange} backdrop="blur">
                        <ModalContent className="bg-[#1a1a1c] border border-white/10">
                            {(onClose) => (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 text-white font-black uppercase tracking-tighter">Retirer ma candidature</ModalHeader>
                                    <ModalBody>
                                        <p className="text-default-400 font-medium">
                                            Es-tu sûr de vouloir retirer ta candidature pour ce match ?
                                        </p>
                                    </ModalBody>
                                    <ModalFooter>
                                        <Button variant="light" onPress={onClose} className="font-bold">
                                            {t('cancel')}
                                        </Button>
                                        <Button
                                            color="danger"
                                            onPress={handleCancelRequest}
                                            isLoading={isCancelling}
                                            className="font-black uppercase tracking-tighter shadow-lg shadow-danger/20"
                                        >
                                            Oui, retirer
                                        </Button>
                                    </ModalFooter>
                                </>
                            )}
                        </ModalContent>
                    </Modal>

                    {/* Delete Confirmation Modal */}
                    <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} backdrop="blur">
                        <ModalContent className="bg-[#1a1a1c] border border-white/10">
                            {(onClose) => (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 text-white font-black uppercase tracking-tighter">Supprimer l'annonce</ModalHeader>
                                    <ModalBody>
                                        <p className="text-default-400 font-medium">
                                            Es-tu sûr de vouloir supprimer définitivement cette annonce ? Cette action est irréversible.
                                        </p>
                                    </ModalBody>
                                    <ModalFooter>
                                        <Button variant="light" onPress={onClose} className="font-bold">
                                            {t('cancel')}
                                        </Button>
                                        <Button color="danger" onPress={handleDelete} isLoading={isDeleting} className="font-black uppercase tracking-tighter shadow-lg shadow-danger/20">
                                            Confirmer la suppression
                                        </Button>
                                    </ModalFooter>
                                </>
                            )}
                        </ModalContent>
                    </Modal>

                    {/* Admin Delete Confirmation Modal */}
                    <Modal isOpen={isAdminDeleteOpen} onOpenChange={onAdminDeleteOpenChange} backdrop="blur">
                        <ModalContent className="bg-[#1a1a1c] border border-white/10">
                            {(onClose) => (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 text-white font-black uppercase tracking-tighter">Suppression Modérateur (ADMIN)</ModalHeader>
                                    <ModalBody>
                                        <p className="text-default-400 font-medium italic">
                                            ⚠️ Attention : En tant qu'administrateur, vous allez supprimer cette annonce.
                                            L'action est définitive.
                                        </p>
                                    </ModalBody>
                                    <ModalFooter>
                                        <Button variant="light" onPress={onClose} className="font-bold">
                                            Annuler
                                        </Button>
                                        <Button color="danger" onPress={handleAdminDelete} isLoading={isAdminDeleting} className="font-black uppercase tracking-tighter shadow-lg shadow-danger/20">
                                            Supprimer définitivement
                                        </Button>
                                    </ModalFooter>
                                </>
                            )}
                        </ModalContent>
                    </Modal>

                    {/* Block Confirmation Modal */}
                    <Modal isOpen={isBlockOpen} onOpenChange={onBlockOpenChange} backdrop="blur">
                        <ModalContent className="bg-[#1a1a1c] border border-white/10">
                            {(onClose) => (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 text-white font-black uppercase tracking-tighter">Bloquer l'utilisateur</ModalHeader>
                                    <ModalBody>
                                        <p className="text-default-400 font-medium">Voulez-vous vraiment BLOQUER cet utilisateur ? Il ne pourra plus accéder à la plateforme.</p>
                                    </ModalBody>
                                    <ModalFooter>
                                        <Button variant="light" onPress={onClose} className="font-bold">Annuler</Button>
                                        <Button color="danger" onPress={async () => { await handleBlockUser(); onClose(); }} isLoading={isBlocking} className="font-black uppercase tracking-tighter shadow-lg shadow-danger/20">Bloquer</Button>
                                    </ModalFooter>
                                </>
                            )}
                        </ModalContent>
                    </Modal>

                    {/* Close Registrations Modal */}
                    <Modal isOpen={isCloseRegOpen} onOpenChange={onCloseRegOpenChange} backdrop="blur">
                        <ModalContent className="bg-[#1a1a1c] border border-white/10">
                            {(onClose) => (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 text-white font-black uppercase tracking-tighter">Clôturer les inscriptions</ModalHeader>
                                    <ModalBody>
                                        <p className="text-default-400 font-medium">Voulez-vous clôturer manuellement les inscriptions pour ce tournoi ?</p>
                                    </ModalBody>
                                    <ModalFooter>
                                        <Button variant="light" onPress={onClose} className="font-bold">Annuler</Button>
                                        <Button color="success" onPress={async () => {
                                            try { await closeRegistrations(); addToast({ title: "Succès", description: "Inscriptions closes", color: "success" }); onClose(); }
                                            catch (e) { addToast({ title: "Erreur", description: "Action impossible", color: "danger" }); }
                                        }} className="font-black uppercase tracking-tighter shadow-lg shadow-success/20">Clôturer</Button>
                                    </ModalFooter>
                                </>
                            )}
                        </ModalContent>
                    </Modal>

                    {/* Cancel Accepted Contact Modal (Owner view) */}
                    <Modal isOpen={isCancelAcceptedOpen} onOpenChange={onCancelAcceptedOpenChange} backdrop="blur">
                        <ModalContent className="bg-[#1a1a1c] border border-white/10">
                            {(onClose) => (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 text-white font-black uppercase tracking-tighter">Annuler le duel confirmé</ModalHeader>
                                    <ModalBody>
                                        <p className="text-default-400 font-medium">Attention : Vous allez annuler ce duel. L'adversaire sera notifié et l'annonce redeviendra ouverte. Continuer ?</p>
                                    </ModalBody>
                                    <ModalFooter>
                                        <Button variant="light" onPress={onClose} className="font-bold">Annuler</Button>
                                        <Button color="danger" onPress={() => {
                                            const acceptedContact = match.contacts?.find(c => c.status === 'accepted');
                                            if (acceptedContact) updateRequestStatus(acceptedContact.user_id, 'refused');
                                            onClose();
                                        }} className="font-black uppercase tracking-tighter shadow-lg shadow-danger/20">Confirmer l'annulation</Button>
                                    </ModalFooter>
                                </>
                            )}
                        </ModalContent>
                    </Modal>
                </div>
            </DataWall>
        </DefaultLayout>
    );
}
