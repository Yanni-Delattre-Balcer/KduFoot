/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";
import { Card, CardBody } from "@heroui/card";
import { useTranslation, Trans } from "react-i18next";

import DefaultLayout from "../../layouts/default";

export default function IndexPage() {
  const { t } = useTranslation(["kdufoot", "base"]);

  return (
    <DefaultLayout maxWidth="max-w-full">
      <section className="flex flex-col gap-5 w-full px-4">

        {/* Hero Section - Compact, title on one line */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-cyan-500/10 via-blue-500/5 to-cyan-500/10 border border-cyan-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent"></div>
          <div className="relative flex flex-col items-center gap-3 py-8 px-6 text-center">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-cyan-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                <span className="text-white">Kdufoot</span>
              </h1>
            </div>
            <p className="text-default-500 text-base">
              {t("homePage.description")}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 mt-2 w-full max-w-4xl mx-auto">
              {/* Analyse Vidéo - Primary & Full Width on Mobile */}
              <Link
                className={buttonStyles({
                  color: "primary",
                  radius: "full",
                  variant: "shadow",
                  size: "lg",
                  className: "w-full sm:w-auto sm:min-w-[200px]"
                })}
                href="/exercises"
              >
                {t("homePage.buttons.exercises")}
              </Link>

              {/* Matchs Group */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Link
                  className={buttonStyles({
                    variant: "bordered",
                    radius: "full",
                    size: "lg",
                    className: "w-full sm:w-auto sm:min-w-[180px]"
                  })}
                  href="/matches?view=find&type=match&scroll=true"
                >
                  {t("homePage.buttons.find_match")}
                </Link>
                <Link
                  className={buttonStyles({
                    variant: "flat",
                    radius: "full",
                    size: "lg",
                    className: "w-full sm:w-auto sm:min-w-[180px] bg-white/10 text-white border border-white/20"
                  })}
                  href="/matches?view=create&type=match&scroll=true"
                >
                  {t("homePage.buttons.create_match")}
                </Link>
              </div>

              {/* Tournaments Group */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Link
                  className={buttonStyles({
                    variant: "bordered",
                    radius: "full",
                    size: "lg",
                    className: "w-full sm:w-auto sm:min-w-[180px]"
                  })}
                  href="/matches?view=find&type=tournament&scroll=true"
                >
                  {t("homePage.buttons.find_tournament")}
                </Link>
                <Link
                  className={buttonStyles({
                    variant: "flat",
                    radius: "full",
                    size: "lg",
                    className: "w-full sm:w-auto sm:min-w-[180px] bg-white/10 text-white border border-white/20"
                  })}
                  href="/matches?view=create&type=tournament&scroll=true"
                >
                  {t("homePage.buttons.create_tournament")}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Présentation personnelle */}
        <Card className="border border-default-200 bg-content1 overflow-hidden">
          <CardBody className="p-6 flex flex-col items-center text-center lg:items-start lg:text-left gap-3">
            <h2 className="text-lg font-bold text-foreground">{t("homePage.about.title")}</h2>
            <p className="text-sm text-default-500 leading-relaxed">
              <Trans
                i18nKey="homePage.about.intro"
                components={[
                  <strong className="text-white font-bold" />,
                  <a href="https://www.iut-bethune.univ-artois.fr/formations/but-reseaux-et-telecommunications/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline hover:text-primary-400 transition-colors" />,
                  <span className="text-primary font-bold" />
                ]}
              />
            </p>
            <p className="text-sm text-default-500 leading-relaxed">
              <Trans
                i18nKey="homePage.about.features"
                components={[
                  <strong className="text-white font-semibold" />,
                  <strong className="text-white font-semibold" />
                ]}
              />
            </p>
            <p className="text-sm text-default-500 leading-relaxed font-semibold">
              {t("homePage.about.footer")}
            </p>
          </CardBody>
        </Card>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-default-200 bg-content1 overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardBody className="relative p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-2xl bg-black shadow-inner border border-white/10 group-hover:border-primary/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h3 className="text-base font-bold">🎬 Analyse Vidéo par IA</h3>
              <p className="text-xs text-default-500">Collez un lien vidéo et notre IA génère des exercices détaillés avec synopsis, thèmes et catégorie d'âge.</p>
            </CardBody>
          </Card>

          <Card className="border border-default-200 bg-content1 overflow-hidden group hover:shadow-lg hover:shadow-red-500/5 transition-all">
            <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardBody className="relative p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-2xl bg-black shadow-inner border border-white/10 group-hover:border-red-500/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <h3 className="text-base font-bold">⚽ Matchs Amicaux</h3>
              <p className="text-xs text-default-500">Publiez ou recherchez des matchs amicaux. Filtrez par catégorie, niveau, distance et format.</p>
            </CardBody>
          </Card>

          <Card className="border border-default-200 bg-content1 overflow-hidden group hover:shadow-lg hover:shadow-red-500/5 transition-all">
            <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardBody className="relative p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-2xl bg-black shadow-inner border border-white/10 group-hover:border-red-500/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-5.25c-.621 0-1.125.504-1.125 1.125v3.375m9 0h-9M4.5 10.5 12 3l7.5 7.5M4.5 10.5H18" />
                </svg>
              </div>
              <h3 className="text-base font-bold">🏆 Tournois Amicaux</h3>
              <p className="text-xs text-default-500">Organisez ou recherchez des tournois de football amateur. Idéal pour dynamiser votre saison.</p>
            </CardBody>
          </Card>

          <Card className="border border-default-200 bg-content1 overflow-hidden group hover:shadow-lg hover:shadow-green-500/5 transition-all">
            <div className="absolute inset-0 bg-linear-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardBody className="relative p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-2xl bg-black shadow-inner border border-white/10 group-hover:border-green-500/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-green-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <h3 className="text-base font-bold">📋 Gestion d'Entraînement</h3>
              <p className="text-xs text-default-500">Organisez vos séances et planifiez votre calendrier sportif. Tout centralisé.</p>
            </CardBody>
          </Card>
        </div>
      </section>
    </DefaultLayout>
  );
}
