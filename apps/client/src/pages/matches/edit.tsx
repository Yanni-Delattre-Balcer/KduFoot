import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useMatch } from '@/hooks/use-matches';
import { Spinner } from '@heroui/spinner';
import MatchForm from '@/components/matches/match-form';

export default function MatchEditPage() {
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { match, isLoading: isLoadingMatch } = useMatch(id || null);

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
                    {t('match.edit_title', 'METTRE À JOUR LE MATCH')}
                </h1>

                {match && (
                    <MatchForm
                        initialData={match}
                        onSuccess={() => navigate('/matches')}
                        onCancel={() => navigate('/matches')}
                    />
                )}
            </div>
        </DefaultLayout>
    );
}
