
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DefaultLayout from '@/layouts/default';
import { useMatch } from '@/hooks/use-matches';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { Chip } from "@heroui/chip";
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Image } from "@heroui/image";

export default function MatchDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { match, isLoading, isError } = useMatch(id || null);

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

    return (
        <DefaultLayout>
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Match vs {match.club?.name}</h1>
                        <div className="flex gap-2 flex-wrap">
                            <Chip color="primary" variant="flat">{match.category}</Chip>
                            <Chip variant="bordered">{match.format}</Chip>
                            <Chip color={match.venue === 'Domicile' ? 'success' : 'warning'} variant="flat">{match.venue}</Chip>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button as={Link} to={`/matches/${id}/edit`} color="secondary" variant="flat">
                            {t('edit', 'Modifier')}
                        </Button>
                        <Button as={Link} to="/matches" variant="light">
                            {t('back', 'Retour')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2">
                        <CardHeader className="font-bold bg-default-50">Détails de la rencontre</CardHeader>
                        <CardBody className="gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-default-500">Date</p>
                                    <p className="font-semibold">{new Date(match.match_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500">Heure</p>
                                    <p className="font-semibold">{match.match_time}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500">Lieu</p>
                                    <p className="font-semibold">{match.venue} - {match.club?.city}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500">Statut</p>
                                    <Chip size="sm">{match.status}</Chip>
                                </div>
                            </div>
                            {match.notes && (
                                <div>
                                    <p className="text-sm text-default-500">Notes</p>
                                    <p className="text-default-700 italic border-l-4 border-default-200 pl-2 mt-1">{match.notes}</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <div className="flex flex-col gap-4">
                        <Card>
                            <CardHeader className="font-bold bg-default-50">Adversaire</CardHeader>
                            <CardBody className="flex flex-col items-center gap-2">
                                {match.club?.logo_url ? (
                                    <Image
                                        alt={match.club.name}
                                        src={match.club.logo_url}
                                        width={100}
                                        height={100}
                                        className="object-contain"
                                    />
                                ) : (
                                    <div className="w-24 h-24 bg-default-200 rounded-full flex items-center justify-center">
                                        <span className="text-2xl font-bold text-default-500">{match.club?.name?.charAt(0)}</span>
                                    </div>
                                )}
                                <h3 className="font-bold text-center">{match.club?.name}</h3>
                                <p className="text-sm text-default-500">{match.club?.city} ({match.club?.zip})</p>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader className="font-bold bg-default-50">Contact</CardHeader>
                            <CardBody className="gap-2">
                                <Button color="primary" className="w-full">
                                    Contacter
                                </Button>
                            </CardBody>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader className="font-bold bg-default-50 flex justify-between">
                        <span>Joueurs Convoqués ({match.contacts?.length || 0})</span>
                        <Button size="sm" variant="light">Gérer</Button>
                    </CardHeader>
                    <CardBody>
                        {match.contacts && match.contacts.length > 0 ? (
                            <ul className="flex flex-col gap-2">
                                {match.contacts.map((contact) => (
                                    <li key={contact.user_id} className="flex justify-between items-center border-b border-default-100 pb-2">
                                        <span>Joueur {contact.user_id} (Placeholder)</span>
                                        <span className="text-xs text-default-400">{new Date(contact.contacted_at).toLocaleDateString()}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-default-500 text-center py-4">Aucun joueur convoqué pour le moment.</p>
                        )}
                    </CardBody>
                </Card>
            </div>
        </DefaultLayout>
    );
}
