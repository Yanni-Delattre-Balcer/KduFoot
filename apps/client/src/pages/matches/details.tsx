
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useMatch } from '@/hooks/use-matches';
import { useUser } from '@/hooks/use-user';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { Chip } from "@heroui/chip";
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Image } from "@heroui/image";

export default function MatchDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useUser();
    const { match, isLoading, isError, contactMatch, deleteMatch } = useMatch(id || null);

    if (isLoading) {
        return (
            <DefaultLayout>
                <div className="flex justify-center items-center h-[50vh]">
                    <Spinner label={t('loading', 'Chargement...')} />
                </div>
            </DefaultLayout>
        );
    }

    if (isError || !match) {
        return (
            <DefaultLayout>
                <div className="flex flex-col items-center justify-center gap-4 h-[50vh]">
                    <h1 className="text-2xl font-bold text-danger">{t('error.not_found', 'Match non trouvé')}</h1>
                    <Button as={Link} to="/matches" color="primary">
                        {t('back_to_list', 'Retour à la liste')}
                    </Button>
                </div>
            </DefaultLayout>
        );
    }

    const handleDelete = async () => {
        if (confirm(t('delete_confirmation', 'Êtes-vous sûr de vouloir supprimer ce match ?'))) {
            try {
                await deleteMatch();
                navigate('/matches');
            } catch (error) {
                console.error("Failed to delete match", error);
                alert(t('error.delete_failed', 'Erreur lors de la suppression du match'));
            }
        }
    };

    const handleContactClick = async (type: 'phone' | 'email') => {
        // ALLOW OWNER TO CLICK FOR TESTING (Commented out check)
        // if (!user || user.id === match.owner_id) return;

        if (!user) {
            alert(t('login_required', 'Veuillez vous connecter pour contacter ce club.'));
            return;
        }

        try {
            await contactMatch({
                message: `Intérêt marqué (Clic ${type === 'phone' ? 'téléphone' : 'email'})`
            });
            // mutate is handled by hook
        } catch (e) {
            console.error("Tracking error", e);
        }
    };

    // Parse Gender from notes if present
    const genderMatch = match.notes?.match(/Genre: (.*)(\n|$)/);
    const gender = genderMatch ? genderMatch[1] : 'Non spécifié';
    const cleanNotes = match.notes?.replace(/Genre: .*(\n|$)/, '').trim();

    return (
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
                    {t('back_to_list', 'Retour aux matchs')}
                </Button>

                {user?.id === match.owner_id && (
                    <div className="flex gap-2">
                        <Button as={Link} to={`/matches/${id}/edit`} color="primary" variant="flat" startContent={
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                        }>
                            {t('edit', 'Modifier')}
                        </Button>
                        <Button color="danger" variant="flat" startContent={
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                        } onPress={handleDelete}>
                            {t('delete', 'Supprimer')}
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Details Card */}
                <Card className="lg:col-span-2 shadow-medium border border-default-100 bg-[#18181b]">
                    <CardHeader className="flex flex-col items-start gap-1 p-6 pb-4 bg-[#232120] rounded-t-xl border-b border-default-100/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Chip size="sm" color="primary" variant="flat" className="font-bold uppercase border border-primary/20">Match Amical</Chip>
                        </div>
                        <h1 className="text-3xl font-black text-white leading-tight">Match vs {match.club?.name || 'Club'}</h1>
                        <p className="text-default-400 font-medium flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            {match.location_address || match.club?.address}, {match.location_city || match.club?.city} ({match.location_zip || match.club?.zip})
                        </p>
                    </CardHeader>

                    <CardBody className="p-6 gap-6">
                        {/* Harmonized Bubbles Grid - 2 Columns (Cleaner, more elegant) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Chip
                                startContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1 text-primary"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /></svg>}
                                variant="flat" color="primary" className="h-12 w-full justify-start text-base font-bold border border-primary/20"
                            >
                                <span className="ml-2">{t(`enums.category.${match.category}`)}</span>
                            </Chip>
                            <Chip
                                startContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1 text-secondary"><path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A6.707 6.707 0 0 1 9.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 0 0-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 0 1-1.112-3.173 6.73 6.73 0 0 0 2.743-1.347 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.22 49.22 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 0 1 3.16 5.337a45.6 45.6 0 0 1 2.006-.343v.256Zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 0 1-2.863 3.207 6.72 6.72 0 0 0 .857-3.294Z" clipRule="evenodd" /></svg>}
                                variant="flat" color="secondary" className="h-12 w-full justify-start text-base font-bold border border-secondary/20"
                            >
                                <span className="ml-2">{match.level ? t(`enums.level.${match.level}`) : t('matchForm.labels.choose')}</span>
                            </Chip>
                            <Chip
                                startContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1 text-warning"><path d="M4.5 3.75a3 3 0 0 0-3 3v.75h21v-.75a3 3 0 0 0-3-3h-15Z" /><path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3v-7.5Zm-18 3.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clipRule="evenodd" /></svg>}
                                variant="flat" color="warning" className="h-12 w-full justify-start text-base font-bold border border-warning/20"
                            >
                                <span className="ml-2">{t(`enums.format.${match.format}`, match.format)}</span>
                            </Chip>
                            <Chip
                                startContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1 text-success"><path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h15a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3v-15ZM13.5 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM12 2.25a.75.75 0 0 1 .75.75v3.69c.576.08 1.118.283 1.594.59l2.61-2.608a.75.75 0 0 1 1.06 1.06l-2.608 2.61c.307.476.51.1.018.59 1.594h3.69a.75.75 0 0 1 0 1.5h-3.69a4.478 4.478 0 0 1-.59 1.594l2.608 2.61a.75.75 0 0 1-1.06 1.06l-2.61-2.609a4.478 4.478 0 0 1-1.594.59v3.69a.75.75 0 0 1-1.5 0v-3.69a4.478 4.478 0 0 1-.59-1.594l-2.61 2.609a.75.75 0 0 1-1.06-1.06l2.609-2.61a4.478 4.478 0 0 1-.59-1.594H2.25a.75.75 0 0 1 0-1.5h3.69a4.478 4.478 0 0 1 .59-1.594L3.922 6.706a.75.75 0 0 1 1.06-1.06l2.61 2.608a4.478 4.478 0 0 1 1.594-.59V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>}
                                variant="flat" color="success" className="h-12 w-full justify-start text-base font-bold border border-success/20"
                            >
                                <span className="ml-2">{match.pitch_type ? t(`enums.pitch.${match.pitch_type}`) : t('matchForm.labels.choose')}</span>
                            </Chip>
                            <Chip
                                startContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1"><path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>}
                                variant="flat" className="h-12 w-full justify-start text-base font-bold border border-default-400/20"
                                color={match.venue === 'Domicile' ? 'success' : match.venue === 'Extérieur' ? 'danger' : 'default'}
                            >
                                <span className="ml-2">{t(`enums.venue.${match.venue}`)}</span>
                            </Chip>
                            <Chip
                                startContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1 text-default-500"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /></svg>}
                                variant="flat" color="default" className="h-12 w-full justify-start text-base font-bold border border-default-200"
                            >
                                <span className="ml-2">{t(`enums.gender.${gender}`)}</span>
                            </Chip>
                            <Chip
                                startContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1 text-warning"><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" /></svg>}
                                variant="flat" color="warning" className="h-12 w-full justify-start text-base font-bold border border-warning/20 bg-warning/10"
                            >
                                <span className="ml-2 text-warning-600 dark:text-warning">{new Date(match.match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </Chip>
                            <Chip
                                startContent={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1 text-warning"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" /></svg>}
                                variant="flat" color="warning" className="h-12 w-full justify-start text-base font-bold border border-warning/20 bg-warning/10"
                            >
                                <span className="ml-2 text-warning-600 dark:text-warning">{match.match_time}</span>
                            </Chip>
                        </div>

                        {/* Notes / Instructions */}
                        {cleanNotes && (
                            <div className="mt-4 space-y-2">
                                <h3 className="font-bold text-lg flex items-center gap-2 text-default-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-default-500">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                    {t('matchForm.labels.notes', 'Notes & Instructions')}
                                </h3>
                                <div className="bg-default-100/10 p-4 rounded-xl border-l-4 border-warning text-default-400 italic">
                                    {cleanNotes}
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Sidebar: Club & Contact */}
                <div className="flex flex-col gap-4">
                    {/* Club Organizer Card - Harmonized Dark Theme */}
                    <Card className="bg-[#18181b] shadow-medium border border-default-100/20">
                        <CardHeader className="font-bold text-center border-b border-default-100/10 justify-center pb-4 text-white">Club Organisateur</CardHeader>
                        <CardBody className="flex flex-col items-center gap-4 py-8">
                            {match.club?.logo_url ? (
                                <Image
                                    alt={match.club.name}
                                    src={match.club.logo_url}
                                    width={120}
                                    height={120}
                                    className="object-contain drop-shadow-md"
                                />
                            ) : (
                                <div className="w-24 h-24 bg-linear-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg text-white">
                                    <span className="text-4xl font-black">{match.club?.name?.charAt(0)}</span>
                                </div>
                            )}
                            <div className="text-center">
                                <h3 className="font-black text-xl text-white leading-tight">{match.club?.name}</h3>
                                <p className="text-white font-black uppercase mt-1 text-lg">{match.club?.city}</p>
                                <p className="text-default-400 text-xs font-medium">({match.club?.zip})</p>
                            </div>
                        </CardBody>
                    </Card>

                    <Card className="shadow-medium border border-orange-500/20 bg-[#202022]">
                        <CardHeader className="font-bold bg-orange-500/10 text-orange-500 justify-center">Contact Rapide</CardHeader>
                        <CardBody className="gap-3 p-4">
                            {match.email && (
                                <a
                                    href={`mailto:${match.email}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.location.href = `mailto:${match.email}`;
                                        handleContactClick('email');
                                    }}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-default-50/5 hover:bg-orange-500/20 border border-transparent hover:border-orange-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="p-2 bg-orange-500/20 rounded-full text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                        </svg>
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] text-default-500 uppercase font-bold tracking-wide">Email</p>
                                        <p className="font-bold text-sm truncate text-white group-hover:text-orange-400">{match.email}</p>
                                    </div>
                                </a>
                            )}
                            {match.phone && (
                                <div
                                    className="flex items-center gap-3 p-3 rounded-lg bg-default-50/5 hover:bg-success-500/20 border border-transparent hover:border-success-500/30 transition-all cursor-pointer group"
                                    onClick={() => {
                                        navigator.clipboard.writeText(match.phone);
                                        handleContactClick('phone');
                                        alert("Numéro copié !");
                                    }}
                                >
                                    <div className="p-2 bg-success-500/20 rounded-full text-success group-hover:bg-success group-hover:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                        </svg>
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] text-default-500 uppercase font-bold tracking-wide">Téléphone (Clic pour copier)</p>
                                        <p className="font-bold text-sm truncate text-white group-hover:text-success-400">{match.phone}</p>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* Interaction / Tracking Section */}
                <div className="lg:col-span-3 mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                            <span className="p-2 bg-linear-to-r from-orange-500 to-amber-500 rounded-lg text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                                </svg>
                            </span>
                            Suivi des Contacts & Intérêts
                        </h2>
                        <Chip size="sm" variant="flat" color="warning" className="font-bold">
                            {match.contacts?.length || 0} intéressé{(match.contacts?.length || 0) > 1 ? 's' : ''}
                        </Chip>
                    </div>

                    <p className="text-default-500 mb-6 max-w-2xl">
                        Cette section liste les clubs qui ont manifesté de l'intérêt pour votre match.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {match.contacts && match.contacts.length > 0 ? (
                            match.contacts.map((contact, index) => (
                                <Card key={index} className="border border-default-200 bg-[#202022]">
                                    <CardBody className="flex flex-row items-center gap-4 p-4">
                                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold shadow-md">
                                            {contact.club_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{contact.club_name || 'Club intéressé'}</p>
                                            <p className="text-xs text-default-500">{new Date(contact.contacted_at).toLocaleDateString()} à {new Date(contact.contacted_at).toLocaleTimeString()}</p>
                                            <p className="text-sm font-medium text-primary mt-1">"{contact.message}"</p>
                                        </div>
                                    </CardBody>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-[#202022] rounded-2xl border border-dashed border-default-300/30">
                                <div className="p-4 bg-default-100/10 rounded-full mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-default-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <p className="text-lg font-bold text-default-300">Aucun contact pour le moment</p>
                                <p className="text-default-500">Dès qu'un club cliquera sur vos coordonnées, il apparaîtra ici.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
