/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";
import { Card, CardBody } from "@heroui/card";
import { useTranslation, Trans } from "react-i18next";

import DefaultLayout from "../layouts/default";
import FootballClock from "../components/football-clock";
import { showVideoAnalysis } from "../config/site";

import { useOnlineCount } from "../hooks/use-online-count";

export default function IndexPage() {
  const { t } = useTranslation(["kdufoot", "base"]);
  const onlineCount = useOnlineCount();

  // Auto-redirection to dashboard removed per user request
  // Users should stay on the home page even if authenticated/complete
  /*
  useEffect(() => {
    if (!isLoading && user && profileComplete) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, profileComplete, isLoading, navigate]);
  */

  return (
    <DefaultLayout maxWidth="max-w-full">
      <section className="flex flex-col gap-5 w-full px-4 pt-2">
        {/* Hero Section with football field background */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-purple-600/15 via-violet-500/10 to-indigo-500/10 border border-purple-500/20">
          {/* Grass stripes */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34,197,94,0.3) 40px, rgba(34,197,94,0.3) 80px)",
            }}
          />
          {/* Field center line + circle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-b from-transparent via-white/5 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5" />

          <div className="relative flex flex-col md:flex-row items-center gap-6 py-8 px-6">
            {/* Left: Title & CTA */}
            <div className="flex-1 flex flex-col items-center md:items-start gap-4 text-center md:text-left w-full px-2 sm:px-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                <span className="text-white">Kdufoot</span>
              </h1>
              <div className="max-w-[280px] sm:max-w-md md:max-w-lg">
                <p className="text-default-500 text-sm sm:text-base leading-relaxed break-words overflow-wrap-anywhere">
                  {t(
                    "homePage.hero.description_ultimate",
                    "Trouvez un match de foot en 3 touches, n'importe où, maintenant. La plateforme élite pour les passionnés du ballon rond.",
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-500 font-bold uppercase tracking-wider">
                    {onlineCount || 1}{" "}
                    {t("homePage.hero.live_players_suffix", "joueurs en ligne")}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                {showVideoAnalysis && (
                  <Link
                    className={`${buttonStyles({
                      radius: "full",
                      variant: "shadow",
                      size: "lg",
                    })} bg-linear-to-r from-blue-600 to-violet-600 text-white border-none min-w-[160px]`}
                    href="/exercises"
                  >
                    {t("homePage.buttons.exercises")}
                  </Link>
                )}
                <Link
                  className={`${buttonStyles({
                    radius: "full",
                    variant: "shadow",
                    size: "lg",
                  })} bg-linear-to-r from-violet-700 to-indigo-800 text-white border-none min-w-[160px]`}
                  href="/matches?type=match"
                >
                  {t("homePage.buttons.match")}
                </Link>
                <Link
                  className={`${buttonStyles({
                    radius: "full",
                    variant: "shadow",
                    size: "lg",
                  })} bg-linear-to-r from-violet-400 to-violet-500 text-white border-none min-w-[160px]`}
                  href="/matches?type=tournament"
                >
                  {t("homePage.buttons.tournament")}
                </Link>
              </div>
            </div>

            {/* Right: Football Clock */}
            <div className="shrink-0">
              <FootballClock size={140} />
            </div>
          </div>
        </div>

        {/* À propos - full width */}
        <Card className="border border-default-200 overflow-hidden w-full">
          <CardBody className="p-5 flex flex-col gap-2">
            <h2 className="text-lg font-bold text-foreground">
              {t("homePage.about.title")}
            </h2>
            <p className="text-base text-default-500 leading-relaxed">
              <Trans
                components={[
                  <strong key="0" className="text-foreground" />,
                  <a
                    key="1"
                    className="text-foreground underline inline-flex items-center gap-1"
                    href="https://iut-bethune.univ-artois.fr/type-de-formation/reseaux-et-telecommunications/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    text{" "}
                    <svg
                      aria-hidden="true"
                      className="text-small"
                      fill="none"
                      focusable="false"
                      height="1em"
                      role="presentation"
                      viewBox="0 0 24 24"
                      width="1em"
                    >
                      <path
                        d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </a>,
                  <strong key="2" className="text-foreground" />,
                ]}
                i18nKey="homePage.about.intro"
              />
            </p>
            {showVideoAnalysis ? (
              <p className="text-base text-default-500 leading-relaxed">
                <Trans
                  components={[
                    <strong key="0" className="text-primary" />,
                    <strong key="1" className="text-violet-500" />,
                  ]}
                  i18nKey="homePage.about.features"
                />
              </p>
            ) : (
              <p className="text-base text-default-500 leading-relaxed">
                {t(
                  "homePage.about.features_fallback",
                  "⚽ Matchs & Tournois amicaux — Trouvez ou publiez vos propres matchs et tournois autour de chez vous.",
                )}
              </p>
            )}
            <p className="text-sm text-default-400 italic mt-2">
              {t(
                "homePage.about.footer",
                "Moins de recherche, plus de terrain. ⚽",
              )}
            </p>
          </CardBody>
        </Card>

        {/* Row: Matchs & Tournois (Violet/Purple) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-default-200 bg-content1 overflow-hidden group hover:shadow-lg hover:shadow-violet-500/10 transition-all">
            <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardBody className="relative p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-2xl bg-black shadow-inner border border-white/10 group-hover:border-violet-500/50 transition-colors">
                <svg
                  className="w-7 h-7 text-violet-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold">
                {t("homePage.cards.match.title")}
              </h3>
              <p className="text-xs text-default-500">
                {t("homePage.cards.match.description")}
              </p>
            </CardBody>
          </Card>

          <Card className="border border-default-200 bg-content1 overflow-hidden group hover:shadow-lg hover:shadow-purple-400/10 transition-all">
            <div className="absolute inset-0 bg-linear-to-br from-purple-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardBody className="relative p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-2xl bg-black shadow-inner border border-white/10 group-hover:border-purple-400/50 transition-colors">
                <svg
                  className="w-7 h-7 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-5.25c-.621 0-1.125.504-1.125 1.125v3.375m9 0h-9M4.5 10.5 12 3l7.5 7.5M4.5 10.5H18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold">
                {t("homePage.cards.tournament.title")}
              </h3>
              <p className="text-xs text-default-500">
                {t("homePage.cards.tournament.description")}
              </p>
            </CardBody>
          </Card>
        </div>
      </section>
    </DefaultLayout>
  );
}
