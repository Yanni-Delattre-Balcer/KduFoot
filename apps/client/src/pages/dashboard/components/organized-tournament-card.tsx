import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Progress } from "@heroui/progress";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Match } from '@/types/match.types';

interface OrganizedTournamentCardProps {
    match: Match;
    isTooLate: boolean;
    isSaving: boolean;
    onDelete: (id: string, date: string, time: string) => void;
    formatDate: (date: string) => string;
    formatTime: (time: string) => string;
}

export const OrganizedTournamentCard = ({
    match,
    isTooLate,
    isSaving,
    onDelete,
    formatDate,
    formatTime
}: OrganizedTournamentCardProps) => {
    const { t } = useTranslation();

    // Extract accepted teams from contacts
    const acceptedContacts = match.contacts?.filter(c => c.status === 'accepted') || [];
    const displayTeams = acceptedContacts.slice(0, 3);
    const remainingTeamsCount = Math.max(0, (match.accepted_count || 0) - 3);

    return (
        <Card
            className="overflow-hidden border transition-all duration-300 shadow-xl hover:shadow-violet-500/20 border-violet-500/40 bg-zinc-900/90 group"
        >
            <div className="absolute inset-0 bg-linear-to-br from-violet-600/10 via-transparent to-transparent opacity-50"></div>
            <CardBody className="p-0">
                <div className="flex flex-col lg:flex-row">
                    {/* Left Section: Info & Progress */}
                    <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-white/5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                                    {match.club?.logo_url ? (
                                        <Image src={match.club.logo_url} className="object-contain" />
                                    ) : (
                                        <span className="text-white font-black text-2xl">{match.club?.name?.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-black text-violet-400 text-2xl sm:text-3xl leading-tight uppercase tracking-tighter group-hover:text-violet-300 transition-colors break-words">
                                        {t('enums.type.tournament').toUpperCase()}
                                    </h3>
                                    <p className="text-white/70 text-sm font-bold uppercase tracking-widest break-words">{match.name || match.club?.name || '??'}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <Chip size="sm" variant="flat" color="secondary" className="font-black text-[10px] sm:text-xs uppercase tracking-wider h-auto py-0.5">
                                            🏆 {t('enums.type.tournament')}
                                        </Chip>
                                        <Chip size="sm" variant="flat" color={match.venue === 'Extérieur' ? 'warning' : 'primary'} className="h-5 text-[9px] uppercase font-black">
                                            {match.venue === 'Extérieur' ? t('dashboard.labels.away_badge') : t('dashboard.labels.home_badge')}
                                        </Chip>
                                    </div>
                                </div>
                            </div>
                            <Chip size="sm" color={match.status === 'active' ? 'secondary' : 'default'} variant="solid" className="font-black uppercase text-xs sm:text-sm py-3 shadow-lg shadow-violet-500/30">
                                {match.status === 'active' ? t('dashboard.status.searching') : t(`dashboard.status.${match.status}`, match.status)}
                            </Chip>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.date', 'Date')}</p>
                                <p className="text-sm font-bold text-white">{formatDate(match.match_date)}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.time', 'Heure')}</p>
                                <p className="text-sm font-bold text-white">{formatTime(match.match_time)}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.format', 'Format')}</p>
                                <Chip size="sm" variant="dot" color="primary" className="font-black text-xs border-none p-0">{match.format || '5x5'}</Chip>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('tournamentForm.labels.fee', 'Frais')}</p>
                                <p className="text-sm font-bold text-green-400">{match.registration_fee ? `${match.registration_fee}€` : t('matchForm.labels.free', 'Gratuit')}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <p className="text-sm font-black text-purple-400 uppercase tracking-widest">{t('dashboard.tournament.filling', 'Remplissage du tournoi')}</p>
                                <p className="text-xs font-bold text-white">{match.accepted_count || 0} / {match.max_teams || '∞'}</p>
                            </div>
                            <Progress
                                size="md"
                                value={match.max_teams ? ((match.accepted_count || 0) / match.max_teams) * 100 : 100}
                                color="secondary"
                                className="max-w-md"
                                classNames={{
                                    indicator: "bg-linear-to-r from-purple-500 to-pink-500"
                                }}
                            />
                        </div>
                    </div>

                    {/* Right Section: Teams & Actions */}
                    <div className="w-full lg:w-80 p-6 flex flex-col justify-between bg-white/[0.02]">
                        <div className="mb-6">
                            <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-3">{t('dashboard.tournament.registered_teams', 'Équipes inscrites')}</p>
                            <div className="flex items-center -space-x-3">
                                {displayTeams.map((contact: any, i: number) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0f0f0f] bg-default-100 flex items-center justify-center overflow-hidden z-[3]">
                                        {contact.club_logo ? <Image src={contact.club_logo} /> : <span className="text-xs sm:text-sm font-black">{contact.club_name?.charAt(0)}</span>}
                                    </div>
                                ))}
                                {remainingTeamsCount > 0 && (
                                    <div className="w-10 h-10 rounded-full border-2 border-[#0f0f0f] bg-purple-500 flex items-center justify-center z-[1]">
                                        <span className="text-xs sm:text-sm font-black text-white">+{remainingTeamsCount}</span>
                                    </div>
                                )}
                                {(match.accepted_count === 0) && (
                                    <p className="text-sm text-default-400 italic">{t('dashboard.tournament.waiting_teams', "En attente d'équipes...")}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {isTooLate ? (
                                <div className="py-3 px-4 text-center border border-dashed border-danger/30 rounded-xl bg-danger/5">
                                    <p className="text-xs sm:text-sm font-black text-danger leading-tight uppercase px-2">
                                        {t('dashboard.alerts.h2_locked')}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button
                                            as={Link}
                                            to={`/matches/${match.id}/edit`}
                                            size="sm"
                                            variant="flat"
                                            className="flex-1 font-bold text-sm h-11 bg-amber-500/10 text-amber-500 active:scale-95"
                                        >
                                            {t('edit')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            color="danger"
                                            className="flex-1 h-11 font-bold text-sm active:scale-95"
                                            onPress={() => onDelete(match.id, match.match_date, match.match_time)}
                                            isLoading={isSaving}
                                        >
                                            {t('delete')}
                                        </Button>
                                    </div>
                                    <Button
                                        as={Link}
                                        to={`/matches/${match.id}`}
                                        size="sm"
                                        variant="solid"
                                        color="secondary"
                                        className="w-full font-bold text-sm h-10 active:scale-95 shadow-md shadow-secondary/20"
                                    >
                                        {t('dashboard.controls.manage_registrations')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};
