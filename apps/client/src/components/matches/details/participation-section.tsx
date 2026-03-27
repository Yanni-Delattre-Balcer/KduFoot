import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addToast } from "@heroui/toast";

interface ParticipationSectionProps {
  user: any;
  match: any;
  profileComplete: boolean;
  isModified: boolean;
  isMarkingRead: boolean;
  handleMarkAsRead: () => Promise<void>;
  onCancelAcceptedOpen: () => void;
  onCancelOpen: () => void;
  onCloseRegOpen: () => void;
  id: string | undefined;
  contactMatch: (data: { message: string }) => Promise<void>;
  openGateway: (msg: string) => void;
  isMasked: boolean;
}

export const ParticipationSection = ({
  user,
  match,
  profileComplete,
  isModified,
  isMarkingRead,
  handleMarkAsRead,
  onCancelAcceptedOpen,
  onCancelOpen,
  onCloseRegOpen,
  id,
  contactMatch,
  openGateway,
  isMasked,
}: ParticipationSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-2xl border-none bg-linear-to-br from-primary/10 to-secondary/10 overflow-hidden">
        <CardHeader className="font-black bg-primary/20 text-white justify-center tracking-widest text-xs py-3 border-b border-white/5">
          {t("details.labels.organizer_management")}
        </CardHeader>
        <CardBody className="gap-6 p-8">
          {user?.id === match.owner_id ? (
            <div className="text-center space-y-4">
              {match.contacts?.some((c: any) => c.status === "accepted") ? (
                <div className="bg-emerald-500/20 border-2 border-emerald-500/30 p-5 rounded-[2rem] space-y-4 mb-4 animate-appearance-in">
                  <p className="text-emerald-400 font-black text-center text-sm tracking-widest flex items-center justify-center gap-2">
                    {t("details.status.confirmed")}
                  </p>
                  <Button
                    className="w-full font-black tracking-tighter h-12 rounded-2xl shadow-lg shadow-rose-500/20"
                    color="danger"
                    variant="shadow"
                    onPress={onCancelAcceptedOpen}
                  >
                    {match.type === "tournament"
                      ? t(
                          "details.buttons.cancel_tournament",
                          "Annuler le tournoi",
                        )
                      : t("details.buttons.cancel_duel", "Annuler le duel")}
                  </Button>
                </div>
              ) : (
                <p className="text-default-500 text-sm font-bold tracking-wide">
                  {t("details.labels.organizer_management")}
                </p>
              )}
              <Button
                as={Link}
                className="w-full font-black tracking-tighter h-14 rounded-2xl bg-white text-black shadow-xl"
                startContent={<span className="text-xl">✍️</span>}
                to={`/matches/${id}/edit`}
                variant="shadow"
              >
                {t("details.buttons.edit_ad")}
              </Button>
              {match.type === "tournament" && match.status === "active" && (
                <Button
                  className="w-full font-black tracking-tighter h-14 rounded-2xl shadow-lg shadow-emerald-500/20"
                  color="success"
                  startContent={<span className="text-xl">🔒</span>}
                  variant="shadow"
                  onPress={onCloseRegOpen}
                >
                  {t("details.buttons.close_tournament")}
                </Button>
              )}
            </div>
          ) : (
            <>
              {isModified && (
                <div className="bg-rose-500/20 border-2 border-rose-500/30 p-5 rounded-[2rem] space-y-4 mb-6 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl animate-bounce">⚠️</span>
                    <p className="text-rose-400 font-black text-center text-sm tracking-widest leading-tight">
                      {t("details.status.modified", "MATCH MODIFIÉ")}
                    </p>
                    <p className="text-rose-300 text-[10px] font-bold opacity-80 text-center">
                      {t(
                        "details.status.modified_desc",
                        "Certains détails ont changé",
                      )}
                    </p>
                  </div>
                  <Button
                    className="w-full font-black tracking-tighter h-12 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    isLoading={isMarkingRead}
                    variant="solid"
                    onPress={handleMarkAsRead}
                  >
                    {t(
                      "details.buttons.view_changes",
                      "J'ai vu les changements",
                    )}
                  </Button>
                </div>
              )}

              {(() => {
                const userContact = match.contacts?.find(
                  (c: any) => c.user_id === user?.id,
                );
                const isProfileIncomplete = !profileComplete;

                // STATE: Accepted → show only "DUEL CONFIRMÉ" block
                if (userContact?.status === "accepted") {
                  return (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-4 animate-appearance-in">
                      <p className="text-emerald-400 font-black text-center text-sm tracking-widest flex items-center justify-center gap-2">
                        {t("details.status.confirmed")}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button
                          className="font-black tracking-tighter h-12 border border-warning/20 shadow-lg shadow-warning/10"
                          color="warning"
                          variant="flat"
                          onPress={() =>
                            (window.location.href = `tel:${match.phone}`)
                          }
                        >
                          {t("details.buttons.call")}
                        </Button>
                        <Button
                          className="font-black tracking-tighter h-12 border border-secondary/20 shadow-lg shadow-secondary/10"
                          color="secondary"
                          variant="flat"
                          onPress={() =>
                            (window.location.href = `mailto:${match.email}`)
                          }
                        >
                          {t("details.buttons.email")}
                        </Button>
                      </div>
                      <Button
                        className="w-full font-bold text-xs sm:text-sm h-11 mt-2"
                        color="danger"
                        variant="flat"
                        onPress={onCancelOpen}
                      >
                        {match.type === "tournament"
                          ? t("match.withdraw_tournament")
                          : t("match.withdraw_match")}
                      </Button>
                    </div>
                  );
                }

                // STATE: Refused → show only "Demande Refusée"
                if (userContact?.status === "refused") {
                  return (
                    <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl">
                      <p className="text-danger font-black text-center text-sm tracking-tighter">
                        {t("details.status.refused")}
                      </p>
                    </div>
                  );
                }

                // STATE: Pending or no contact → show initial request block
                return (
                  <>
                    <p className="text-default-400 text-sm text-center">
                      {t("details.labels.participate_prompt")}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button
                        className="font-black tracking-tighter h-12 border border-warning/20 shadow-lg shadow-warning/10"
                        color="warning"
                        variant="flat"
                        onPress={() => {
                          if (isMasked) {
                            openGateway(
                              t(
                                "error.profile_incomplete_action",
                                "Veuillez compléter votre profil pour effectuer cette action",
                              ),
                            );

                            return;
                          }
                          window.location.href = `tel:${match.phone}`;
                        }}
                      >
                        {t("details.buttons.call")}
                      </Button>
                      <Button
                        className="font-black tracking-tighter h-12 border border-secondary/20 shadow-lg shadow-secondary/10"
                        color="secondary"
                        variant="flat"
                        onPress={() => {
                          if (isMasked) {
                            openGateway(
                              t(
                                "error.profile_incomplete_action",
                                "Veuillez compléter votre profil pour effectuer cette action",
                              ),
                            );

                            return;
                          }
                          window.location.href = `mailto:${match.email}`;
                        }}
                      >
                        {t("details.buttons.email")}
                      </Button>
                    </div>
                    <div className="relative flex items-center py-2">
                      <div className="flex-1 border-t border-default-100/10" />
                      <span className="shrink-0 px-2 text-default-500 text-xs font-bold tracking-widest">
                        ou
                      </span>
                      <div className="flex-1 border-t border-default-100/10" />
                    </div>

                    {isProfileIncomplete && (
                      <div className="bg-danger/10 border border-danger/20 p-3 rounded-xl mb-2 animate-appearance-in">
                        <p className="text-danger text-xs sm:text-sm font-bold text-center">
                          {t(
                            "profile_incomplete",
                            "Complète ton profil club pour postuler à ce match",
                          )}
                        </p>
                      </div>
                    )}

                    {userContact?.message ===
                    t("match.contact_tracking_message") ? (
                      <Button
                        className="w-full font-black tracking-tighter h-12 shadow-lg shadow-danger/20 border border-danger/20"
                        color="danger"
                        variant="shadow"
                        onPress={onCancelOpen}
                      >
                        {t("details.buttons.cancel_request")}
                      </Button>
                    ) : (
                      <Button
                        className="w-full font-black tracking-tighter h-12 shadow-lg"
                        color={isProfileIncomplete ? "default" : "primary"}
                        isDisabled={isProfileIncomplete}
                        onPress={async () => {
                          if (isMasked) {
                            openGateway(
                              t(
                                "error.profile_incomplete_action",
                                "Veuillez compléter votre profil pour effectuer cette action",
                              ),
                            );

                            return;
                          }
                          if (!user) {
                            openGateway(
                              t(
                                "error.login_required",
                                "Veuillez vous connecter pour envoyer une demande.",
                              ),
                            );

                            return;
                          }
                          if (!user.club_id) {
                            addToast({
                              title: t(
                                "profile_incomplete",
                                "Profil incomplet",
                              ),
                              description: t(
                                "match.club_link_required",
                                "Veuillez lier votre club pour envoyer une demande.",
                              ),
                              color: "warning",
                              timeout: 5000,
                            });

                            return;
                          }
                          try {
                            await contactMatch({
                              message: t("match.contact_tracking_message"),
                            });
                            addToast({
                              title: t("success"),
                              description: t(
                                "matchForm.alerts.contact_success",
                                { date: match.match_date },
                              ),
                              variant: "flat",
                              color: "success",
                              timeout: 5000,
                            });
                          } catch (e: unknown) {
                            addToast({
                              title: t("error.title"),
                              description:
                                (e as Error).message || t("error.generic"),
                              variant: "flat",
                              color: "danger",
                              timeout: 5000,
                            });
                          }
                        }}
                      >
                        {t("match.send_request")}
                      </Button>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
