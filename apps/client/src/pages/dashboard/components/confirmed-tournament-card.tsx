import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Progress } from "@heroui/progress";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ConfirmedTournamentCardProps {
    participation: any;
    highlighted?: boolean;
    onMarkAsRead: (matchId: string) => void;
    formatDate: (date: string) => string;
    formatTime: (time: string) => string;
}

export const ConfirmedTournamentCard = ({
    participation: part,
    highlighted,
    onMarkAsRead,
    formatDate,
    formatTime
}: ConfirmedTournamentCardProps) => {
    const { t } = useTranslation();

    // Mock/Real teams logos (limit to 3)
    const teams = part.accepted_teams || [];
    const displayTeams = teams.slice(0, 3);
    const remainingTeamsCount = Math.max(0, part.accepted_count - 3);

    return (
        <Card
            id={`card-${part.match_id}`}
            className={`overflow-hidden border transition-all duration-300 shadow-sm hover:shadow-md ${highlighted ? 'border-danger ring-4 ring-danger/20 animate-pulse' : 'border-purple-400/20 bg-purple-500/5'
                } group`}
        >
            <CardBody className="p-0">
                <div className="flex flex-col lg:flex-row">
                    {/* Left Section: Info & Progress */}
                    <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-white/5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                                    {part.host_club_logo ? (
                                        <Image src={part.host_club_logo} className="object-contain" />
                                    ) : (
                                        <span className="text-white font-black text-2xl">{part.host_club_name?.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-black text-white text-lg sm:text-xl leading-tight">
                                        {part.host_club_name}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <Chip size="sm" variant="flat" color="secondary" className="font-black text-[10px] sm:text-xs uppercase tracking-wider h-auto py-0.5 whitespace-normal">
                                            🏆 {part.name || t('enums.type.tournament')}
                                        </Chip>
                                        <Chip size="sm" variant="flat" color="warning" className="h-5 text-[9px] uppercase font-black">
                                            ✈️ {t('dashboard.away_label')}
                                        </Chip>
                                    </div>
                                </div>
                            </div>
                            <Chip size="sm" color="success" variant="flat" className="font-black uppercase text-xs sm:text-sm py-3">
                                {t('dashboard.status.accepted')}
                            </Chip>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.date', 'Date')}</p>
                                <p className="text-sm font-bold text-white">{formatDate(part.match_date)}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.time', 'Heure')}</p>
                                <p className="text-sm font-bold text-white">{formatTime(part.match_time)}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.format', 'Format')}</p>
                                <Chip size="sm" variant="dot" color="primary" className="font-black text-xs border-none p-0">{part.match_format || '5x5'}</Chip>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('tournamentForm.labels.fee', 'Frais')}</p>
                                <p className="text-sm font-bold text-green-400">{part.entry_fee ? `${part.entry_fee}€` : t('matchForm.labels.free', 'Gratuit')}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <p className="text-sm font-black text-purple-400 uppercase tracking-widest">{t('dashboard.tournament.filling', 'Remplissage du tournoi')}</p>
                                <p className="text-xs font-bold text-white">{part.accepted_count || 0} / {part.max_teams || '∞'}</p>
                            </div>
                            <Progress
                                size="md"
                                value={part.max_teams ? ((part.accepted_count || 0) / part.max_teams) * 100 : 100}
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
                                {displayTeams.map((team: any, i: number) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0f0f0f] bg-default-100 flex items-center justify-center overflow-hidden z-[3]">
                                        {team.logo_url ? <Image src={team.logo_url} /> : <span className="text-xs sm:text-sm font-black">{team.name?.charAt(0)}</span>}
                                    </div>
                                ))}
                                {remainingTeamsCount > 0 && (
                                    <div className="w-10 h-10 rounded-full border-2 border-[#0f0f0f] bg-purple-500 flex items-center justify-center z-[1]">
                                        <span className="text-xs sm:text-sm font-black text-white">+{remainingTeamsCount}</span>
                                    </div>
                                )}
                                {part.accepted_count === 0 && (
                                    <p className="text-sm text-default-400 italic">{t('dashboard.tournament.waiting_teams', "En attente d'équipes...")}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {part.notification_state === 1 && (
                                <Button
                                    size="sm"
                                    color="danger"
                                    className="w-full font-black uppercase text-xs sm:text-sm h-10 shadow-lg shadow-danger/20"
                                    onPress={() => onMarkAsRead(part.match_id)}
                                >
                                    {t('dashboard.labels.view_changes')}
                                </Button>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    size="sm"
                                    color="default"
                                    variant="flat"
                                    className="w-full sm:flex-1 font-bold text-sm h-10 active:scale-95 bg-white/5"
                                    as={Link}
                                    to={`/matches/${part.match_id}`}
                                >
                                    {t('dashboard.controls.view')}
                                </Button>
                                <Button
                                    size="sm"
                                    color="primary"
                                    variant="flat"
                                    className="w-full sm:flex-1 font-black text-[10px] uppercase h-10 active:scale-95 shadow-sm"
                                    as="a"
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${part.opponent_stadium_address || part.location_address || part.host_stadium_address}, ${part.opponent_city || part.location_city || part.host_city}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t('dashboard.controls.itinerary')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="solid"
                                    color="secondary"
                                    className="w-full sm:flex-1 font-bold text-sm h-10 active:scale-95"
                                    as="a"
                                    href={`tel:${part.host_phone || part.opponent_phone}`}
                                >
                                    {t('dashboard.controls.contact')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};
