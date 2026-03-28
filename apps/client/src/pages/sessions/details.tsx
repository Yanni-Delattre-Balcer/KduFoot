import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Card, CardBody, CardHeader } from "@heroui/card";

import { useSession } from "@/hooks/use-sessions";
import DefaultLayout from "@/layouts/default";
import { SessionDetailsSkeleton } from "@/components/skeletons/details-skeleton";

/**
 * This component displays the details of a specific training session.
 * It uses several "hooks" to manage state and logic.
 */
export default function SessionDetailsPage() {
  /**
   * useParams allows us to access dynamic parameters from the URL.
   * In this case, we get the 'id' of the session from the address bar.
   */
  const { id } = useParams<{ id: string }>();

  /**
   * useTranslation is part of 'react-i18next'.
   * It provides the 't' function to translate text based on the user's language.
   */
  const { t } = useTranslation();

  /**
   * useSession is a custom hook that fetches session data from our API.
   * It handles the complex logic of fetching and provides simple status flags like 'isLoading'.
   */
  const { session, isLoading, isError } = useSession(id || null);

  // If the data is still being fetched, we show a loading spinner
  if (isLoading) {
    return (
      <DefaultLayout>
        <SessionDetailsSkeleton />
      </DefaultLayout>
    );
  }

  if (isError || !session) {
    return (
      <DefaultLayout>
        <div className="flex flex-col items-center justify-center gap-4 h-[50vh]">
          <h1 className="text-2xl font-bold text-danger">
            {t("error.not_found", "Séance non trouvée")}
          </h1>
          <Button as={Link} color="primary" to="/sessions">
            {t("back_to_list", "Retour au planning")}
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
            <h1 className="text-3xl font-bold mb-2">
              {session.name || t("session.untitled", "Séance sans titre")}
            </h1>
            <div className="flex gap-2 flex-wrap items-center">
              <Chip color="primary" variant="flat">
                {t(`enums.category.${session.category}`)}
              </Chip>
              <Chip variant="bordered">{session.total_duration} min</Chip>
              <span className="text-default-500 text-sm">
                {session.scheduled_date
                  ? new Date(session.scheduled_date).toLocaleDateString()
                  : t("session.not_scheduled", "Non planifiée")}
              </span>
            </div>
          </div>
          {/* Navigation buttons to edit or go back */}
          <div className="flex gap-2">
            <Button
              as={Link}
              color="secondary"
              to={`/sessions/${id}/edit`}
              variant="flat"
            >
              {t("edit", "Modifier")}
            </Button>
            <Button as={Link} to="/sessions" variant="light">
              {t("back", "Retour")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 flex flex-col gap-4">
            <h2 className="text-xl font-bold">
              {t("session.timeline", "Timeline de la séance")}
            </h2>
            {session.exercises && session.exercises.length > 0 ? (
              <div className="flex flex-col gap-4">
                {session.exercises
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((item) => (
                    <Card key={item.exercise_id} className="w-full">
                      <CardBody className="flex flex-row gap-4 p-4">
                        <div className="flex items-center justify-center bg-primary/10 rounded-lg min-w-[80px] h-20 text-primary font-bold text-xl">
                          {item.duration}'
                        </div>
                        <div className="flex flex-col grow justify-center">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-lg">
                              {item.exercise?.title}
                            </h3>
                            <Button
                              isIconOnly
                              as={Link}
                              size="sm"
                              to={`/exercises/${item.exercise_id}`}
                              variant="light"
                            >
                              Details
                            </Button>
                          </div>
                          <p className="text-sm text-default-500 line-clamp-2">
                            {item.exercise?.synopsis}
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardBody className="text-center text-default-500 py-8">
                  {t(
                    "session.no_exercises",
                    "Aucun exercice ajouté à cette séance.",
                  )}
                </CardBody>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="font-bold bg-default-50">
                {t("summary", "Résumé")}
              </CardHeader>
              <CardBody className="gap-2">
                <div className="flex justify-between border-b border-default-100 pb-1">
                  <span className="text-default-500">
                    {t("duration_total", "Durée Totale")}
                  </span>
                  <span className="font-semibold">
                    {session.total_duration} min
                  </span>
                </div>
                <div className="flex justify-between border-b border-default-100 pb-1">
                  <span className="text-default-500">
                    {t("exercises.title", "Exercices")}
                  </span>
                  <span className="font-semibold">
                    {session.exercises?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">
                    {t("status", "Statut")}
                  </span>
                  <Chip
                    color={
                      session.status === "completed" ? "success" : "primary"
                    }
                    size="sm"
                  >
                    {t(`session.status_enum.${session.status}`, session.status)}
                  </Chip>
                </div>
              </CardBody>
            </Card>

            {session.constraints && (
              <Card>
                <CardHeader className="font-bold bg-default-50">
                  {t("session.constraints", "Contraintes")}
                </CardHeader>
                <CardBody className="gap-2">
                  {session.constraints.players && (
                    <div className="flex justify-between">
                      <span className="text-default-500">
                        {t("players", "Joueurs")}
                      </span>
                      <span>{session.constraints.players}</span>
                    </div>
                  )}
                  {session.constraints.equipment && (
                    <div className="flex flex-col">
                      <span className="text-default-500 text-sm">
                        {t("equipment", "Matériel")}
                      </span>
                      <span>{session.constraints.equipment}</span>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
