import DefaultLayout from "@/layouts/default";
import { useTranslation } from "react-i18next";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { useExercises } from "@/hooks/use-exercises";
import { useMatches } from "@/hooks/use-matches";
import { useEffect, useState } from "react";
import { Exercise } from "@/types/exercise.types";
import { Match } from "@/types/match.types";
import { Spinner } from "@heroui/spinner";
import { useNavigate, Link } from "react-router-dom";
import { Chip } from "@heroui/chip";
import FootballClock from '../../components/football-clock';

export default function FavoritesPage() {
    const { t, i18n } = useTranslation();
    const { favorites } = useFavorites();
    const { exercises, isLoading: loadingEx } = useExercises();
    const { matches, isLoading: loadingMatches } = useMatches();

    // View state for Toggle Buttons (like Matches Page)
    const [view, setView] = useState<'exercises' | 'matches'>('exercises');

    const [favExercises, setFavExercises] = useState<Exercise[]>([]);
    const [favMatches, setFavMatches] = useState<Match[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (exercises && favorites?.exercises) {
            setFavExercises(exercises.filter(e => favorites.exercises.includes(e.id)));
        }
    }, [exercises, favorites]);

    useEffect(() => {
        if (matches && favorites?.matches) {
            setFavMatches(matches.filter(m => favorites.matches.includes(m.id)));
        }
    }, [matches, favorites]);

    return (
        <DefaultLayout maxWidth="max-w-full">
            <section className="flex flex-col gap-6 w-full px-4">

                {/* Hero - Mes Favoris */}
                <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-pink-600/15 via-rose-500/10 to-purple-500/10 border border-pink-500/20">
                    {/* Grass stripes - standard green */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34,197,94,0.3) 40px, rgba(34,197,94,0.3) 80px)' }}></div>
                    {/* Field center line + circle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-b from-transparent via-white/5 to-transparent"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5"></div>

                    {/* Football clock - top right */}
                    <div className="hidden md:block absolute top-4 right-4 z-10">
                        <FootballClock size={140} />
                    </div>

                    <div className="relative flex flex-col items-center gap-6 py-14 px-6 text-center">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-pink-500/10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-pink-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-pink-500 to-rose-500">
                                {t("nav.favorites")}
                            </h1>
                        </div>
                        <p className="text-default-500 text-lg max-w-lg">
                            {view === 'exercises'
                                ? t('favorites.description_exercises')
                                : t('favorites.description_matches')}
                        </p>

                        <div className="flex gap-3 p-1 rounded-2xl bg-default-100/50 backdrop-blur-sm">
                            <Button
                                color={view === 'exercises' ? "success" : "default"}
                                variant={view === 'exercises' ? "shadow" : "light"}
                                onPress={() => setView('exercises')}
                                size="lg"
                                className={view === 'exercises' ? "font-bold text-white bg-linear-to-r from-[#17c964] to-[#12a150]" : ""}
                                startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                }
                            >
                                {t('favorites.tab_exercises')}
                            </Button>
                            <Button
                                color={view === 'matches' ? "warning" : "default"}
                                variant={view === 'matches' ? "shadow" : "light"}
                                onPress={() => setView('matches')}
                                size="lg"
                                className={view === 'matches' ? "font-bold text-white bg-linear-to-r from-orange-500 to-amber-500" : ""}
                                startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m11.372-5.362c.962-.203 1.934-.377 2.916-.52M19.5 4.5c.125.163.233.332.322.508M19.5 4.5v.243a12.98 12.98 0 0 1-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35" />
                                    </svg>
                                }
                            >
                                {t('favorites.tab_matches')}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="animate-appearance-in">
                    {/* Content - Unwrapped */}
                    {view === 'exercises' && (
                        <>
                            {loadingEx ? (
                                <div className="flex justify-center py-10"><Spinner color="success" /></div>
                            ) : favExercises.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {favExercises.map(ex => (
                                        <Card key={ex.id} isPressable onPress={() => navigate(`/exercises/${ex.id}`)} className="group hover:shadow-lg hover:shadow-pink-500/10 transition-all bg-[#251820] border border-pink-500/20 hover:border-pink-500/40">
                                            <CardHeader className="flex gap-3">
                                                <div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-pink-500/10 to-rose-500/10 flex items-center justify-center">
                                                    <div className="p-2 rounded-full bg-pink-500/10">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-pink-600 dark:text-pink-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <p className="text-md font-bold text-default-900 group-hover:text-pink-600 transition-colors">{ex.title}</p>
                                                    <p className="text-small text-default-600 font-medium">{ex.category}</p>
                                                </div>
                                            </CardHeader>
                                            <CardBody className="pt-0">
                                                <p className="text-sm text-default-700 line-clamp-2">{ex.synopsis}</p>
                                            </CardBody>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card className="border border-pink-500/20 bg-[#251820]">
                                    <CardBody className="py-16 flex flex-col items-center gap-4 text-center">
                                        <div className="p-4 rounded-full bg-green-500/10 text-green-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-green-900/90 dark:text-green-100">{t('favorites.empty_exercises')}</p>
                                            <p className="text-md text-green-900/70 dark:text-green-200/70 mt-1">{t('favorites.empty_exercises_desc')}</p>
                                        </div>
                                        <Button as={Link} to="/exercises" color="success" variant="flat" className="mt-2 text-green-700 bg-green-100 dark:bg-green-500/20 dark:text-green-300 font-bold shadow-sm">
                                            {t('favorites.discover_exercises')}
                                        </Button>
                                    </CardBody>
                                </Card>
                            )}
                        </>
                    )}

                    {view === 'matches' && (
                        <>
                            {loadingMatches ? (
                                <div className="flex justify-center py-10"><Spinner color="warning" /></div>
                            ) : favMatches.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {favMatches.map(match => (
                                        <Card key={match.id} isPressable onPress={() => navigate(`/matches/${match.id}`)} className="group hover:shadow-lg hover:shadow-pink-500/10 transition-all bg-[#251820] border border-pink-500/20 hover:border-pink-500/40">
                                            <CardBody>
                                                <div className="flex justify-between items-start mb-2">
                                                    <Chip size="sm" variant="flat" color="warning" className="font-semibold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">{match.category}</Chip>
                                                    <Chip size="sm" variant="flat" color={match.venue === 'Domicile' ? 'success' : 'danger'}>{t(`enums.venue.${match.venue}`)}</Chip>
                                                </div>
                                                <p className="font-bold text-lg text-default-900 group-hover:text-orange-600 transition-colors">vs {match.club.name}</p>
                                                <div className="flex items-center gap-2 mt-2 text-sm text-default-600 font-medium">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                                    </svg>
                                                    {new Date(match.match_date).toLocaleDateString(i18n.language)}
                                                </div>
                                                {match.level && <Chip size="sm" variant="flat" color="secondary" className="mt-3">{match.level}</Chip>}
                                            </CardBody>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card className="border border-pink-500/20 bg-[#251820]">
                                    <CardBody className="py-16 flex flex-col items-center gap-4 text-center">
                                        <div className="p-4 rounded-full bg-orange-500/10 text-orange-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m11.372-5.362c.962-.203 1.934-.377 2.916-.52M19.5 4.5c.125.163.233.332.322.508M19.5 4.5v.243a12.98 12.98 0 0 1-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-orange-900/90 dark:text-orange-100">{t('favorites.empty_matches')}</p>
                                            <p className="text-md text-orange-900/70 dark:text-orange-200/70 mt-1">{t('favorites.empty_matches_desc')}</p>
                                        </div>
                                        <Button as={Link} to="/matches" color="warning" variant="flat" className="mt-2 bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 font-bold shadow-sm">
                                            {t('favorites.find_matches')}
                                        </Button>
                                    </CardBody>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </section>
        </DefaultLayout >
    );
}
