import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useMatch } from '@/hooks/use-matches';
import { Spinner } from '@heroui/spinner';
import { useUser } from '@/hooks/use-user';
import DataWall from '@/components/data-wall';
import MatchForm from '@/components/matches/match-form';
import TournamentForm from '@/components/matches/tournament-form';

import { useSWRConfig } from 'swr';

export default function MatchEditPage() {
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { mutate } = useSWRConfig();

    const { match, isLoading: isLoadingMatch } = useMatch(id || null);
    const { isLocked } = useUser();

    // Force revalidation on mount to avoid ghost locking
    useEffect(() => {
        mutate('/api/me/context');
    }, [mutate]);

    if (isLocked) {
        return (
            <DefaultLayout>
                <div className="container mx-auto p-6 flex justify-center items-center min-h-[60vh]">
                    <DataWall />
                </div>
            </DefaultLayout>
        );
    }

    if (isEditing && isLoadingMatch) {
        return (
            <DefaultLayout>
                <div className="flex justify-center items-center h-[50vh]">
                    <Spinner label={t('loading', 'Chargement...')} />
                </div>
            </DefaultLayout>
        );
    }

    return (
        <DefaultLayout>
            <div className="max-w-7xl mx-auto px-4 w-full">
                <h1 className="text-3xl font-bold mb-8 text-violet-300">
                    {isEditing ? t('match.edit_title', 'METTRE À JOUR LE MATCH') : t('match.create_title', 'CRÉER UN MATCH')}
                </h1>

                {(match || !isEditing) && (
                    <>
                        {(!isEditing || match?.type === 'match') ? (
                            <MatchForm
                                initialData={match}
                                onSuccess={() => navigate('/matches')}
                                onCancel={() => navigate('/matches')}
                            />
                        ) : (
                            <TournamentForm
                                initialData={match}
                                onSuccess={() => navigate('/matches')}
                                onCancel={() => navigate('/matches')}
                            />
                        )}
                    </>
                )}
            </div>
        </DefaultLayout>
    );
}
