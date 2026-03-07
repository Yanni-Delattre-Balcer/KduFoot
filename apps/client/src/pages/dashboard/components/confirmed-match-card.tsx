import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Progress } from "@heroui/progress";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ConfirmedMatchCardProps {
    match: any;
    highlighted?: boolean;
    onMarkAsRead: (matchId: string) => void;
    formatDate: (date: string) => string;
    formatTime: (time: string) => string;
}

export const ConfirmedMatchCard = ({
    match,
    highlighted,
    onMarkAsRead,
    formatDate,
    formatTime
}: ConfirmedMatchCardProps) => {
    const { t } = useTranslation();

    const isUserHome = match.isUserHome;
    const opponentClubName = match.opponent_club_name;
    const opponentClubLogo = match.opponent_club_logo;

    return (
        <Card
            id={`card-${match.match_id}`}
            className={`overflow-hidden border transition-all duration-300 shadow-xl hover:shadow-violet-500/20 col-span-full ${highlighted ? 'border-danger ring-4 ring-danger/20 animate-pulse' : 'border-violet-500/40 bg-zinc-900/90'
                } group`}
        >
            <div className="absolute inset-0 bg-linear-to-br from-violet-600/10 via-transparent to-transparent opacity-50"></div>
            <CardBody className="p-0">
                <div className="flex flex-col md:flex-row">
                    {/* Left Section: Info */}
                    <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                                    {opponentClubLogo ? (
                                        <Image src={opponentClubLogo} className="object-contain" />
                                    ) : (
                                        <span className="text-white font-black text-2xl">{opponentClubName?.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-black text-white text-lg sm:text-xl leading-tight break-words">
                                        {opponentClubName}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Chip size="sm" variant="flat" color="secondary" className="font-black text-xs sm:text-sm uppercase tracking-wider">
                                            ⚽ {t('enums.type.match')}
                                        </Chip>
                                        <Chip size="sm" variant="flat" color={isUserHome ? 'primary' : 'warning'} className="h-5 text-[9px] uppercase font-black">
                                            {isUserHome ? t('dashboard.labels.home_badge') : t('dashboard.labels.away_badge')}
                                        </Chip>
                                    </div>
                                </div>
                            </div>
                            <Chip size="sm" color="secondary" variant="solid" className="font-black uppercase text-xs sm:text-sm py-3 shadow-lg shadow-violet-500/30">
                                {t('dashboard.status.accepted')}
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
                                <Chip size="sm" variant="dot" color="primary" className="font-black text-xs border-none p-0">{match.format || match.match_format || '11v11'}</Chip>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-1">{t('matchForm.labels.pitch_type', 'Terrain')}</p>
                                <p className="text-sm font-bold text-white break-words">{match.opponent_pitch_type || match.pitch_type || '—'}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <p className="text-sm font-black text-violet-400 uppercase tracking-widest">{t('dashboard.match.found')}</p>
                                <p className="text-xs font-bold text-white">1 / 1</p>
                            </div>
                            <Progress
                                size="md"
                                value={100}
                                color="secondary"
                                className="max-w-md"
                                classNames={{
                                    indicator: "bg-linear-to-r from-violet-500 to-indigo-500"
                                }}
                            />
                        </div>
                    </div>

                    {/* Right Section: VS Visual & Actions */}
                    <div className="w-full md:w-80 p-6 flex flex-col justify-between bg-white/[0.02]">
                        <div className="mb-6 flex flex-col items-center">
                            <p className="text-xs sm:text-sm font-black text-default-400 uppercase tracking-widest mb-4 w-full text-center md:text-left">{t('dashboard.labels.match_opposition')}</p>

                            <div className="flex items-center justify-center gap-6 w-full">
                                {/* User Club (Left) */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full border-2 border-orange-500/30 bg-orange-500/10 flex items-center justify-center overflow-hidden">
                                        {/* Since we don't have user club logo easily here without extra props, we use a generic icon or initial if we had it */}
                                        <span className="text-orange-500 font-black text-lg">M</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-default-400 uppercase">{t('dashboard.labels.my_club')}</span>
                                </div>

                                <div className="text-xl font-black text-default-300 italic">VS</div>

                                {/* Opponent Club (Right) */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full border-2 border-success-500/30 bg-success-500/10 flex items-center justify-center overflow-hidden">
                                        {opponentClubLogo ? (
                                            <Image src={opponentClubLogo} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-success-500 font-black text-lg">{opponentClubName?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-bold text-default-400 uppercase truncate max-w-[60px]">{opponentClubName}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {match.notification_state === 1 && (
                                <Button
                                    size="sm"
                                    color="danger"
                                    className="w-full font-black uppercase text-xs sm:text-sm h-10 shadow-lg shadow-danger/20"
                                    onPress={() => onMarkAsRead(match.match_id)}
                                >
                                    {t('dashboard.labels.view_changes')}
                                </Button>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    size="sm"
                                    variant="flat"
                                    className="w-full sm:flex-1 font-bold text-sm h-10 bg-white/5 active:scale-95"
                                    as={Link}
                                    to={`/matches/${match.match_id}`}
                                >
                                    {t('dashboard.controls.view')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    color="primary"
                                    className="w-full sm:flex-1 font-black text-[10px] uppercase h-10 active:scale-95 shadow-sm"
                                    as="a"
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${(!match.isUserHome && match.opponent_stadium_address) ? match.opponent_stadium_address : match.location_address}, ${(!match.isUserHome && match.opponent_city) ? match.opponent_city : match.location_city}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t('dashboard.controls.itinerary')}
                                </Button>
                                <Button
                                    size="sm"
                                    color="secondary"
                                    variant="solid"
                                    className="w-full sm:flex-1 font-bold text-sm h-10 active:scale-95 shadow-md shadow-violet-500/20"
                                    as="a"
                                    href={`tel:${match.opponent_phone}`}
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
