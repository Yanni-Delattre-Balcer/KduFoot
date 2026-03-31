import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Image as HeroImage } from "@heroui/image";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface ContactTrackingProps {
  match: any;
  user: any;
}

export const ContactTracking = ({ match, user }: ContactTrackingProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="lg:col-span-3 mt-12">
      <div className="bg-linear-to-br from-[#1c1c1f] to-[#141416] rounded-5xl p-8 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary via-secondary to-primary opacity-50" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3 tracking-tighter">
              <span className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-primary/10">
                🤝
              </span>
              {t("match.contact_tracking")}
            </h2>
            <p className="text-default-500 font-medium opacity-80 pl-0 md:pl-12">
              {t("match.contact_tracking_desc", {
                count: match.contacts?.length || 0,
              })}
            </p>
          </div>
          <Chip
            className="font-black px-6 self-center md:self-auto shadow-lg shadow-primary/20"
            color="primary"
            size="lg"
            variant="shadow"
          >
            {t("match.interest_count", {
              count: match.contacts?.length || 0,
            })}
          </Chip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {match.contacts && match.contacts.length > 0 ? (
            match.contacts.map((contact: any, index: number) => {
              const isActionable =
                user?.id === match.owner_id &&
                contact.message === t("match.contact_tracking_message");
              const statusConfig = {
                accepted: {
                  border: "border-emerald-500/50",
                  bg: "bg-emerald-500/5",
                  color: "text-emerald-400",
                  icon: "✅",
                },
                refused: {
                  border: "border-rose-500/30",
                  bg: "bg-rose-500/5",
                  color: "text-rose-400",
                  icon: "❌",
                },
                withdrawn: {
                  border: "border-zinc-500/20",
                  bg: "bg-zinc-500/5",
                  color: "text-zinc-500",
                  icon: "🗑️",
                },
                pending: {
                  border: "border-primary/30",
                  bg: "bg-primary/5",
                  color: "text-primary",
                  icon: "⏳",
                },
              }[
                contact.status as
                  | "accepted"
                  | "refused"
                  | "withdrawn"
                  | "pending"
              ] || {
                border: "border-primary/30",
                bg: "bg-primary/5",
                color: "text-primary",
                icon: "⏳",
              };

              return (
                <Card
                  key={index}
                  className={`border-2 ${statusConfig.border} ${statusConfig.bg} rounded-3xl transition-all ${isActionable ? "hover:scale-[1.03] hover:border-primary shadow-xl shadow-primary/5 cursor-pointer" : ""}`}
                  isPressable={isActionable}
                  onPress={() => isActionable && navigate("/dashboard")}
                >
                  <CardBody className="p-6 gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-2xl shadow-inner relative`}
                      >
                        {contact.club_logo ? (
                          <HeroImage
                            className="w-10 h-10 object-contain"
                            src={contact.club_logo}
                          />
                        ) : (
                          contact.club_name?.charAt(0) || "?"
                        )}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#111] border border-white/10 flex items-center justify-center text-xs">
                          {statusConfig.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="font-black text-white tracking-tighter leading-tight mb-1 wrap-break-word overflow-wrap-anywhere">
                          {contact.club_name || "Club intéressé"}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] text-default-500 font-bold tracking-widest">
                            {new Date(
                              contact.contacted_at,
                            ).toLocaleDateString()}
                          </p>
                          {contact.message && (
                            <p className="text-[10px] text-primary font-black tracking-tighter italic opacity-80 wrap-break-word overflow-wrap-anywhere">
                              {contact.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {contact.status !== "pending" && (
                      <div
                        className={`py-1.5 px-3 rounded-xl border border-current/20 font-black text-[10px] text-center tracking-widest ${statusConfig.color}`}
                      >
                        {contact.status === "accepted"
                          ? t("details.status.accepted")
                          : contact.status === "refused"
                            ? t("details.status.refused")
                            : t("details.status.withdrawn")}
                      </div>
                    )}

                    {isActionable && (
                      <Button
                        className="font-black tracking-tighter w-full rounded-xl"
                        color="primary"
                        size="sm"
                        variant="shadow"
                        onPress={() => navigate("/dashboard?tab=requests")}
                      >
                        {t("details.buttons.view_request", "Voir la demande")}
                      </Button>
                    )}
                  </CardBody>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full min-h-[300px] flex flex-col items-center justify-center bg-white/5 rounded-4xl border border-dashed border-white/10 opacity-60 p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-3xl mb-4">
                🌑
              </div>
              <p className="text-default-400 font-black tracking-widest text-sm max-w-[200px] md:max-w-none">
                {t("details.status.no_applications")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
