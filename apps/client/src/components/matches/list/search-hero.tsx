import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";

import FootballClock from "../../football-clock";

interface SearchHeroProps {
  type: "match" | "tournament";
  view: "find" | "create";
  setType: (t: "match" | "tournament") => void;
  setView: (v: "find" | "create") => void;
  handleManualSearch: () => void;
  isMasked: boolean;
}

export const SearchHero = ({
  type,
  view,
  setType,
  setView,
  handleManualSearch,
  isMasked,
}: SearchHeroProps) => {
  const { t } = useTranslation();

  const uiConfig = {
    match: {
      gradient:
        "bg-linear-to-br from-violet-900/40 via-violet-800/30 to-transparent",
      border: "border-violet-800/50",
      titleGradient: "from-violet-800 via-violet-700 to-violet-600",
      iconColor: "text-violet-200",
      title: t("match.tab_matches", "Matchs Amicaux"),
      desc_find: t("matchesPage.description_find"),
      desc_create: t("matchesPage.description_create"),
    },
    tournament: {
      gradient:
        "bg-linear-to-br from-purple-300/20 via-fuchsia-200/5 to-transparent",
      border: "border-purple-300/40",
      titleGradient: "from-purple-400 to-purple-300",
      iconColor: "text-purple-300",
      title: t("match.tab_tournaments", "Tournois Amicaux"),
      desc_find: t("matchesPage.description_find_tournament"),
      desc_create: t("matchesPage.description_create_tournament"),
    },
  }[type];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${uiConfig.gradient} border ${uiConfig.border}`}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34,197,94,0.3) 40px, rgba(34,197,94,0.3) 80px)",
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-b from-transparent via-white/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5 pointer-events-none" />

      <div className="hidden md:block absolute top-4 right-4 z-10">
        <FootballClock size={140} />
      </div>

      <div className="relative flex flex-col items-center gap-6 py-14 px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className={`p-3 rounded-2xl ${type === "match" ? "bg-violet-800/20" : "bg-purple-300/20"}`}
          >
            <svg
              className={`w-8 h-8 ${uiConfig.iconColor}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0-4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            className={`text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r ${uiConfig.titleGradient} tracking-tighter`}
          >
            {uiConfig.title}
          </h1>
        </div>
        <p className="text-default-400 text-sm md:text-lg max-w-lg">
          {view === "find" ? uiConfig.desc_find : uiConfig.desc_create}
        </p>

        <div className="flex flex-col gap-4 items-center">
          <div className="flex gap-2 p-1 rounded-2xl bg-default-200/30 backdrop-blur-sm border border-white/5">
            <Button
              className={
                type === "match"
                  ? "font-bold text-white shadow-lg shadow-violet-500/40 bg-linear-to-r from-violet-800 to-violet-600"
                  : ""
              }
              color={type === "match" ? "secondary" : "default"}
              size="sm"
              variant={type === "match" ? "solid" : "light"}
              onPress={() => setType("match")}
            >
              {t("match.tab_matches", "Matchs")}
            </Button>
            <Button
              className={
                type === "tournament"
                  ? "font-bold text-purple-950 shadow-lg shadow-purple-300/30 bg-purple-300"
                  : ""
              }
              color={type === "tournament" ? "default" : "default"}
              size="sm"
              variant={type === "tournament" ? "solid" : "light"}
              onPress={() => setType("tournament")}
            >
              {t("match.tab_tournaments", "Tournois")}
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              className={`w-full sm:w-auto sm:flex-none font-bold px-6 h-12 rounded-xl transition-all ${view === "find" ? (type === "match" ? "bg-linear-to-r from-violet-800 via-violet-700 to-violet-600 text-white shadow-lg shadow-violet-800/40" : "bg-purple-300 text-purple-950 shadow-lg shadow-purple-300/40") : "text-default-500 hover:bg-default-200 border border-white/10"}`}
              color={
                view === "find"
                  ? type === "match"
                    ? "secondary"
                    : "default"
                  : "default"
              }
              size="lg"
              startContent={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              variant={view === "find" ? "solid" : "flat"}
              onPress={() => {
                if (view === "find") handleManualSearch();
                else setView("find");
              }}
            >
              {type === "match" ? t("match.find") : t("match.find_tournament")}
              {isMasked && " 🔒"}
            </Button>
            <Button
              className={`w-full sm:w-auto sm:flex-none font-bold px-6 h-12 rounded-xl transition-all ${view === "create" ? (type === "match" ? "bg-linear-to-r from-violet-800 via-violet-700 to-violet-600 text-white shadow-lg shadow-violet-800/40" : "bg-purple-300 text-purple-950 shadow-lg shadow-purple-300/40") : "text-default-500 hover:bg-default-200 border border-white/10"}`}
              color={
                view === "create"
                  ? type === "match"
                    ? "secondary"
                    : "default"
                  : "default"
              }
              size="lg"
              startContent={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4.5v15m7.5-7.5h-15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              variant={view === "create" ? "solid" : "flat"}
              onPress={() => setView("create")}
            >
              {type === "match"
                ? t("match.create")
                : t("match.create_tournament")}
              {isMasked && " 🔒"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
