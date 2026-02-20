import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '../../layouts/default';
import { useMatches } from '../../hooks/use-matches';
import { useUser } from '../../hooks/use-user';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';
import { Button } from '@heroui/button';
import { Link } from 'react-router-dom';
import { Chip } from "@heroui/chip";
import { Select, SelectItem } from "@heroui/select";
import FootballClock from '../../components/football-clock';
import { Input } from "@heroui/input";
import { Category } from '../../types/exercise.types';
import { Format, PitchType, Venue, MatchFilters, Level } from '../../types/match.types';

const CATEGORIES = Object.values(Category);
const LEVELS = Object.values(Level);
const FORMATS: Format[] = ['11v11', '8v8', '5v5', 'Futsal'];
const PITCH_TYPES: PitchType[] = ['Herbe', 'Synthétique', 'Hybride', 'Stabilisé', 'Indoor'];
const VENUES: Venue[] = ['Domicile', 'Extérieur', 'Neutre'];

import MatchForm from '@/components/matches/match-form';
import TournamentForm from '@/components/matches/tournament-form';

export default function MatchesPage() {
    const { t, i18n } = useTranslation();
    const [view, setView] = useState<'find' | 'create'>('find');
    const [type, setType] = useState<'match' | 'tournament'>('match');
    const [displayMode, setDisplayMode] = useState<'list' | 'calendar'>('list');
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const { user } = useUser();
    const [filters, setFilters] = useState<MatchFilters>({});
    const [radiusKm, setRadiusKm] = useState<number>(0); // 0 = pas de filtre distance

    // Build filters with user coordinates when radius is active
    const effectiveFilters = useMemo(() => {
        const f = { ...filters };
        if (radiusKm > 0 && user?.club?.latitude && user?.club?.longitude) {
            (f as any).radius_km = radiusKm;
            (f as any).user_lat = user.club.latitude;
            (f as any).user_lng = user.club.longitude;
        }
        return f;
    }, [filters, radiusKm, user?.club?.latitude, user?.club?.longitude]);

    const { matches, isError } = useMatches(effectiveFilters);

    const handleFilterChange = (key: keyof MatchFilters, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value || undefined
        }));
    };

    const clearFilters = () => {
        setFilters({});
        setRadiusKm(0);
    };

    const activeFilterCount = Object.values(filters).filter(v => v !== undefined).length + (radiusKm > 0 ? 1 : 0);

    const handleCreateSuccess = () => {
        setView('find');
    };

    const canUseDistance = !!(user?.club?.latitude && user?.club?.longitude);

    // Group matches by date for calendar view
    const matchesByDate = useMemo(() => {
        const map: Record<string, number> = {};
        for (const m of matches) {
            const dateKey = m.match_date; // ISO date string YYYY-MM-DD
            map[dateKey] = (map[dateKey] || 0) + 1;
        }
        return map;
    }, [matches]);

    // Calendar helpers
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1; // Monday = 0
    };
    const formatDateKey = (year: number, month: number, day: number) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // Dynamic date formatting
    const getMonthName = (date: Date) => date.toLocaleDateString(i18n.language, { month: 'long' });
    const dayNames = useMemo(() => {
        const days = [];
        const d = new Date(2024, 0, 1); // Monday Jan 1 2024
        for (let i = 0; i < 7; i++) {
            days.push(d.toLocaleDateString(i18n.language, { weekday: 'short' }));
            d.setDate(d.getDate() + 1);
        }
        return days;
    }, [i18n.language]);

    const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
    const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

    const handleDayClick = (dateKey: string) => {
        if (selectedDate === dateKey) {
            setSelectedDate(null);
            handleFilterChange('date', '');
        } else {
            setSelectedDate(dateKey);
            handleFilterChange('date', dateKey);
        }
    };

    const filteredMatches = selectedDate
        ? matches.filter(m => m.match_date === selectedDate)
        : matches;

    // UI Configuration based on type
    const uiConfig = {
        match: {
            gradient: "bg-linear-to-br from-orange-500/20 via-yellow-400/15 to-transparent",
            border: "border-orange-500/20",
            titleGradient: "from-orange-500 via-yellow-400 to-yellow-400",
            iconColor: "text-orange-500",
            title: t('match.title', 'Matchs Amicaux'),
            desc_find: t('matchesPage.description_find'),
            desc_create: t('matchesPage.description_create')
        },
        tournament: {
            gradient: "bg-linear-to-br from-yellow-300/15 via-yellow-200/5 to-transparent",
            border: "border-yellow-400/20",
            titleGradient: "from-yellow-400 to-yellow-500",
            iconColor: "text-yellow-500",
            title: t('matchesPage.title_tournament', 'Tournois Amicaux'),
            desc_find: t('matchesPage.description_find_tournament'),
            desc_create: t('matchesPage.description_create_tournament')
        }
    }[type];

    return (
        <DefaultLayout maxWidth="max-w-full">
            <section className="flex flex-col gap-6 w-full px-4">

                {/* Hero - Matchs / Tournois */}
                <div className={`relative overflow-hidden rounded-3xl ${uiConfig.gradient} border ${uiConfig.border}`}>
                    {/* Grass stripes */}
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
                            <div className={`p-3 rounded-2xl ${type === 'match' ? 'bg-orange-500/10' : 'bg-yellow-500/10'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 ${uiConfig.iconColor}`}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                                </svg>
                            </div>
                            <h1 className={`text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r ${uiConfig.titleGradient}`}>
                                {uiConfig.title}
                            </h1>
                        </div>
                        <p className="text-default-500 text-lg max-w-lg">
                            {view === 'find' ? uiConfig.desc_find : uiConfig.desc_create}
                        </p>

                        <div className="flex flex-col gap-4 items-center">
                            {/* Primary Selector: Match vs Tournament */}
                            <div className="flex gap-2 p-1 rounded-2xl bg-default-200/30 backdrop-blur-sm border border-white/5">
                                <Button
                                    size="sm"
                                    color={type === 'match' ? "warning" : "default"}
                                    variant={type === 'match' ? "solid" : "light"}
                                    onPress={() => setType('match')}
                                    className={type === 'match' ? "font-bold text-white shadow-lg shadow-orange-500/40 bg-linear-to-r from-orange-500 to-yellow-500" : ""}
                                >
                                    {t('match.tab_matches', 'Matchs')}
                                </Button>
                                <Button
                                    size="sm"
                                    color={type === 'tournament' ? "default" : "default"}
                                    variant={type === 'tournament' ? "solid" : "light"}
                                    onPress={() => setType('tournament')}
                                    className={type === 'tournament' ? "font-bold text-yellow-900 shadow-lg shadow-yellow-500/20 bg-yellow-400" : ""}
                                >
                                    {t('match.tab_tournaments', 'Tournois')}
                                </Button>
                            </div>

                            {/* Secondary Selector: Find vs Create */}
                            <div className="flex flex-wrap justify-center gap-3 p-1 rounded-2xl bg-default-100/50 backdrop-blur-sm">
                                <Button
                                    color={view === 'find' ? "default" : "default"}
                                    variant={view === 'find' ? "shadow" : "light"}
                                    onPress={() => setView('find')}
                                    size="lg"
                                    className={view === 'find' ? (type === 'match' ? "font-bold bg-linear-to-r from-orange-500 via-yellow-400 to-yellow-400 text-white shadow-lg shadow-orange-500/30" : "font-bold bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-500/30") : ""}
                                    startContent={
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                        </svg>
                                    }
                                >
                                    {type === 'match' ? t('match.find') : t('match.find_tournament')}
                                </Button>
                                <Button
                                    color={view === 'create' ? "default" : "default"}
                                    variant={view === 'create' ? "shadow" : "light"}
                                    onPress={() => setView('create')}
                                    size="lg"
                                    className={view === 'create' ? (type === 'match' ? "font-bold bg-linear-to-r from-orange-500 via-yellow-400 to-yellow-400 text-white shadow-lg shadow-orange-500/30" : "font-bold bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-500/30") : ""}
                                    startContent={
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    }
                                >
                                    {type === 'match' ? t('match.create') : t('match.create_tournament')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Block - Separated but Coordinated */}
                <div className="flex flex-col gap-6 w-full animate-appearance-in">
                    {view === 'create' ? (
                        type === 'match' ? (
                            <MatchForm onSuccess={handleCreateSuccess} />
                        ) : (
                            <TournamentForm onSuccess={handleCreateSuccess} />
                        )
                    ) : (
                        <div className="flex flex-col gap-5">

                            {/* Filter Section - Coordinated container */}
                            <Card className={`shadow-lg border ${type === 'match' ? 'shadow-orange-500/5 border-orange-500/20' : 'shadow-yellow-500/5 border-yellow-500/20'} bg-[#232120] overflow-hidden`}>
                                <CardHeader className="pb-0 pt-5 px-5 relative">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${type === 'match' ? 'bg-orange-500/10' : 'bg-yellow-500/10'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 ${type === 'match' ? 'text-orange-600 dark:text-orange-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-default-900 dark:text-default-100">{t('matchesPage.filters.title')}</h3>
                                            {activeFilterCount > 0 && (
                                                <Chip size="sm" color="warning" variant="flat" className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">{activeFilterCount} {t('matchesPage.filters.active')}</Chip>
                                            )}
                                        </div>
                                        {activeFilterCount > 0 && (
                                            <Button size="sm" variant="light" color="danger" onPress={clearFilters}>
                                                {t('matchesPage.filters.clear')}
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardBody className="px-5 pb-5 relative flex flex-col gap-4">
                                    <p className="text-small text-default-500 italic">
                                        {t("match.filters.explanation")}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                        <Select
                                            label={t('matchesPage.filters.category')}
                                            placeholder={t('matchesPage.filters.all')}
                                            selectedKeys={filters.category ? [filters.category] : []}
                                            onChange={(e) => handleFilterChange('category', e.target.value)}
                                            size="sm"
                                            classNames={{ trigger: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        >
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat}>{t(`enums.category.${cat}`)}</SelectItem>
                                            ))}
                                        </Select>

                                        <Select
                                            label={t('matchesPage.filters.level')}
                                            placeholder={t('matchesPage.filters.all')}
                                            selectedKeys={filters.level ? [filters.level] : []}
                                            onChange={(e) => handleFilterChange('level', e.target.value)}
                                            size="sm"
                                            classNames={{ trigger: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        >
                                            {LEVELS.map((lvl) => (
                                                <SelectItem key={lvl}>{t(`enums.level.${lvl}`)}</SelectItem>
                                            ))}
                                        </Select>

                                        <Select
                                            label={t('matchesPage.filters.format')}
                                            placeholder={t('matchesPage.filters.all')}
                                            selectedKeys={filters.format ? [filters.format] : []}
                                            onChange={(e) => handleFilterChange('format', e.target.value)}
                                            size="sm"
                                            classNames={{ trigger: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        >
                                            {FORMATS.map((f) => (
                                                <SelectItem key={f}>{t(`enums.format.${f}`, f)}</SelectItem>
                                            ))}
                                        </Select>

                                        <Select
                                            label={t('matchesPage.filters.gender')}
                                            placeholder={t('matchesPage.filters.all')}
                                            selectedKeys={filters.notes && filters.notes.includes('Genre:') ? [filters.notes.split('Genre: ')[1]] : []}
                                            onChange={(e) => handleFilterChange('notes', e.target.value ? `Genre: ${e.target.value}` : '')} // Hacky filter via notes
                                            size="sm"
                                            classNames={{ trigger: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        >
                                            <SelectItem key="Masculin">{t('enums.gender.Masculin')}</SelectItem>
                                            <SelectItem key="Féminin">{t('enums.gender.Féminin')}</SelectItem>
                                            <SelectItem key="Mixte">{t('enums.gender.Mixte')}</SelectItem>
                                        </Select>

                                        <Select
                                            label={t('matchesPage.filters.pitch_type')}
                                            placeholder={t('matchesPage.filters.all')}
                                            selectedKeys={filters.pitch_type ? [filters.pitch_type] : []}
                                            onChange={(e) => handleFilterChange('pitch_type', e.target.value)}
                                            size="sm"
                                            classNames={{ trigger: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        >
                                            {PITCH_TYPES.map((type) => (
                                                <SelectItem key={type}>{t(`enums.pitch.${type}`)}</SelectItem>
                                            ))}
                                        </Select>

                                        <Input
                                            label={t('matchesPage.filters.date')}
                                            type="date"
                                            value={filters.date || ''}
                                            onChange={(e) => handleFilterChange('date', e.target.value)}
                                            size="sm"
                                            classNames={{ inputWrapper: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        />

                                        <Select
                                            label={t('matchesPage.filters.venue')}
                                            placeholder={t('matchesPage.filters.all')}
                                            selectedKeys={filters.venue ? [filters.venue] : []}
                                            onChange={(e) => handleFilterChange('venue', e.target.value)}
                                            size="sm"
                                            classNames={{ trigger: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        >
                                            {VENUES.map((v) => (
                                                <SelectItem key={v}>{t(`enums.venue.${v}`)}</SelectItem>
                                            ))}
                                        </Select>

                                        <Input
                                            label={t('matchesPage.filters.city')}
                                            placeholder="Ex: Lens"
                                            value={filters.location_city || ''}
                                            onChange={(e) => handleFilterChange('location_city', e.target.value)}
                                            size="sm"
                                            isClearable
                                            onClear={() => handleFilterChange('location_city', '')}
                                            classNames={{ inputWrapper: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        />

                                        <Input
                                            label={t('matchesPage.filters.zip')}
                                            placeholder="Ex: 62300"
                                            value={filters.location_zip || ''}
                                            onChange={(e) => handleFilterChange('location_zip', e.target.value)}
                                            size="sm"
                                            isClearable
                                            onClear={() => handleFilterChange('location_zip', '')}
                                            classNames={{ inputWrapper: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        />

                                        <Input
                                            type="number"
                                            label={t('matchesPage.filters.radius')}
                                            placeholder={canUseDistance ? "Ex: 20" : t('matchForm.labels.siret')}
                                            min={0}
                                            max={200}
                                            value={radiusKm > 0 ? String(radiusKm) : ''}
                                            onChange={(e) => setRadiusKm(parseInt(e.target.value) || 0)}
                                            size="sm"
                                            isDisabled={!canUseDistance}
                                            endContent={<span className="text-default-400 text-sm">km</span>}
                                            description={!canUseDistance ? t('matchForm.alerts.must_link') : radiusKm > 0 ? `depuis ${user?.club?.city || 'club'}` : undefined}
                                            classNames={{ inputWrapper: "bg-zinc-900/80 border-white/20 hover:border-orange-500/50 transition-colors", label: "text-zinc-400 font-medium" }}
                                        />
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Display Mode Toggle */}
                            <div className="flex items-center gap-2 px-1">
                                <div className="flex gap-1 p-0.5 rounded-xl bg-default-100/50">
                                    <Button
                                        size="sm"
                                        variant={displayMode === 'list' ? 'solid' : 'light'}
                                        color={displayMode === 'list' ? 'warning' : 'default'}
                                        onPress={() => setDisplayMode('list')}
                                        className={displayMode === 'list' ? 'font-bold' : ''}
                                        startContent={
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                            </svg>
                                        }
                                    >
                                        {t('matchesPage.view.list')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={displayMode === 'calendar' ? 'solid' : 'light'}
                                        color={displayMode === 'calendar' ? 'warning' : 'default'}
                                        onPress={() => setDisplayMode('calendar')}
                                        className={displayMode === 'calendar' ? 'font-bold' : ''}
                                        startContent={
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                            </svg>
                                        }
                                    >
                                        {t('matchesPage.view.calendar')}
                                    </Button>
                                </div>
                                {selectedDate && (
                                    <Button size="sm" variant="light" color="danger" onPress={() => { setSelectedDate(null); handleFilterChange('date', ''); }}>
                                        ✕ {new Date(selectedDate + 'T00:00:00').toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                                    </Button>
                                )}
                            </div>

                            {/* Calendar View */}
                            {displayMode === 'calendar' && (
                                <Card className="shadow-lg shadow-orange-500/5 border border-orange-500/20 bg-[#232120] overflow-hidden">
                                    <CardHeader className="px-5 pt-5 pb-3">
                                        <div className="flex justify-between items-center w-full">
                                            <Button size="sm" variant="light" onPress={prevMonth} isIconOnly>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                                </svg>
                                            </Button>
                                            <h3 className="text-xl font-bold text-orange-400">
                                                {getMonthName(calendarMonth)} {calendarMonth.getFullYear()}
                                            </h3>
                                            <Button size="sm" variant="light" onPress={nextMonth} isIconOnly>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                                </svg>
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardBody className="px-3 pb-5 pt-0">
                                        {/* Day headers */}
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {dayNames.map(d => (
                                                <div key={d} className="text-center text-xs font-semibold text-default-400 uppercase py-1">
                                                    {d}
                                                </div>
                                            ))}
                                        </div>
                                        {/* Calendar grid */}
                                        <div className="grid grid-cols-7 gap-1">
                                            {/* Empty cells for days before the 1st */}
                                            {Array.from({ length: getFirstDayOfMonth(calendarMonth) }).map((_, i) => (
                                                <div key={`empty-${i}`} className="h-16" />
                                            ))}
                                            {/* Day cells */}
                                            {Array.from({ length: getDaysInMonth(calendarMonth) }).map((_, i) => {
                                                const day = i + 1;
                                                const dateKey = formatDateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                                                const count = matchesByDate[dateKey] || 0;
                                                const isToday = dateKey === formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                                                const isSelected = selectedDate === dateKey;

                                                return (
                                                    <button
                                                        key={day}
                                                        onClick={() => count > 0 ? handleDayClick(dateKey) : undefined}
                                                        className={`
                                                            h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-sm relative border border-white/5
                                                            ${isSelected ? 'bg-orange-500/30 border-2 border-orange-500 shadow-lg shadow-orange-500/20' : ''}
                                                            ${isToday && !isSelected ? 'ring-1 ring-orange-500/50 bg-orange-500/10' : ''}
                                                            ${count > 0 ? 'hover:bg-orange-500/20 cursor-pointer bg-zinc-800/80' : 'cursor-default bg-zinc-900/40'}
                                                            ${!count && !isSelected && !isToday ? 'text-zinc-600' : ''}
                                                        `}
                                                    >
                                                        <span className={`text-xs font-semibold ${isToday ? 'text-orange-400' : 'text-zinc-400'} ${isSelected ? 'text-orange-300' : ''} ${count > 0 ? 'text-zinc-200' : ''}`}>
                                                            {day}
                                                        </span>
                                                        {count > 0 && (
                                                            <div className="flex flex-wrap justify-center gap-px max-w-[90%]">
                                                                {Array.from({ length: Math.min(count, 4) }).map((_, bi) => (
                                                                    <span key={bi} className="text-[10px] leading-none">⚽</span>
                                                                ))}
                                                                {count > 4 && (
                                                                    <span className="text-[8px] text-orange-400 font-bold">+{count - 4}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </CardBody>
                                </Card>
                            )}

                            {isError && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
                                    {t('error.loading_matches')}
                                </div>
                            )}

                            {/* Match Results */}
                            {filteredMatches.length > 0 && (
                                <div className="flex items-center gap-2 px-1">
                                    <Chip size="sm" variant="flat" color="warning" className="bg-orange-100 text-orange-700">{filteredMatches.length}</Chip>
                                    <span className="text-sm text-default-500">{filteredMatches.length > 1 ? t('matchesPage.found') : t('matchesPage.found').replace('(s)', '').replace('(aux)', 'al')}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredMatches.map((match) => (
                                    <Card key={match.id} className={`group hover:shadow-lg transition-all border border-orange-500/20 hover:border-orange-500/40 bg-[#232120] ${user?.id === match.owner_id ? 'ring-2 ring-orange-500 shadow-orange-500/20' : ''}`}>
                                        <CardHeader className="pb-2 pt-4 px-4 flex-col items-start gap-1 relative">
                                            {user?.id === match.owner_id && (
                                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-linear-to-r from-orange-500 to-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-lg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                                                    </svg>
                                                    {t('matchesPage.my_creation')}
                                                </div>
                                            )}
                                            <div className="flex flex-col w-full">
                                                <h4 className="font-bold text-xl text-default-900 group-hover:text-orange-500 transition-colors uppercase tracking-tight truncate w-full">
                                                    {match.club?.name || t('matchesPage.unknown_club')}
                                                </h4>
                                                <p className="text-small text-default-500 font-medium">{match.location_city || match.club?.city} ({match.location_zip || match.club?.zip})</p>
                                            </div>
                                        </CardHeader>
                                        <CardBody className="py-2 px-4 gap-3">
                                            {/* Date & Time Row - Simplified */}
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-default-600 bg-default-50 p-2 rounded-lg justify-center">
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-500">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                                    </svg>
                                                    <span className="font-semibold capitalize text-xs sm:text-sm">{new Date(match.match_date).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                                </div>
                                                <div className="hidden sm:block w-px h-4 bg-default-300"></div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-500">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                    </svg>
                                                    <span className="font-semibold text-xs sm:text-sm">{match.match_time}</span>
                                                </div>
                                            </div>

                                            {match.distance_km != null && (
                                                <div className="flex justify-center">
                                                    <Chip size="sm" variant="flat" color="primary" className="h-5 text-[10px]">
                                                        {match.distance_approximate ? '~' : ''}{match.distance_km} km
                                                    </Chip>
                                                </div>
                                            )}
                                        </CardBody>
                                        <CardFooter className="px-4 pb-4">
                                            <Button as={Link} to={`/matches/${match.id}`} size="sm" variant="solid" color="warning" className="font-bold w-full bg-linear-to-r from-orange-400 to-amber-500 text-white shadow-md shadow-orange-500/20">
                                                {t('details')}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>

                            {filteredMatches.length === 0 && !isError && (
                                <Card className="border border-orange-500/20 bg-[#232120] overflow-hidden">
                                    <div className="absolute inset-0 bg-linear-to-br from-orange-500/5 to-transparent pointer-events-none"></div>
                                    <CardBody className="relative py-16 flex flex-col items-center gap-4 text-center">
                                        <div className="p-4 rounded-full bg-orange-500/10">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-orange-400">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-orange-900/80 dark:text-orange-100">{t('matchesPage.empty_title')}</p>
                                            <p className="text-sm text-orange-800/60 dark:text-orange-200/60 mt-1">{t('matchesPage.empty_desc')}</p>
                                        </div>
                                        <Button color="warning" variant="flat" onPress={() => setView('create')} className="mt-2 font-semibold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                                            {t('match.create')}
                                        </Button>
                                    </CardBody>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </DefaultLayout>
    );
}
