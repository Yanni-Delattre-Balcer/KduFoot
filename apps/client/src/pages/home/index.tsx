/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";
import { Card, CardBody } from "@heroui/card";
import { useTranslation } from "react-i18next";

import DefaultLayout from "../../layouts/default";

export default function IndexPage() {
  const { t } = useTranslation(["kdufoot", "base"]);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-12">

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-cyan-500/10 border border-cyan-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent"></div>
          <div className="relative flex flex-col items-center gap-6 py-20 px-6 text-center">
            <div className="p-4 rounded-2xl bg-cyan-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-cyan-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <div>
              <span className="text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">
                {t("homePage.title.prefix")}&nbsp;
              </span>
              <span className="text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-purple-600">
                {t("homePage.title.highlight")}
              </span>
              <br />
              <span className="text-4xl lg:text-5xl font-bold text-foreground">
                {t("homePage.title.suffix")}
              </span>
            </div>
            <p className="text-lg text-default-500 max-w-xl">
              {t("site.description")}
            </p>

            <div className="flex gap-4 mt-4">
              <Link
                className={buttonStyles({
                  color: "primary",
                  radius: "full",
                  variant: "shadow",
                  size: "lg",
                })}
                href="/exercises"
              >
                {t("homePage.buttons.exercises")}
              </Link>
              <Link
                className={buttonStyles({
                  variant: "bordered",
                  radius: "full",
                  size: "lg",
                })}
                href="/matches"
              >
                {t("homePage.buttons.sessions")}
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-default-200 overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardBody className="relative p-6 flex flex-col items-center text-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Analyse Vidéo</h3>
              <p className="text-sm text-default-500">Collez un lien YouTube et obtenez des exercices détaillés générés par IA.</p>
            </CardBody>
          </Card>

          <Card className="border border-default-200 overflow-hidden group hover:shadow-lg hover:shadow-orange-500/5 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardBody className="relative p-6 flex flex-col items-center text-center gap-4">
              <div className="p-3 rounded-2xl bg-orange-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-orange-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Trouver un Match</h3>
              <p className="text-sm text-default-500">Recherchez des adversaires par catégorie, distance et disponibilité.</p>
            </CardBody>
          </Card>

          <Card className="border border-default-200 overflow-hidden group hover:shadow-lg hover:shadow-green-500/5 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardBody className="relative p-6 flex flex-col items-center text-center gap-4">
              <div className="p-3 rounded-2xl bg-green-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-green-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Entraînement</h3>
              <p className="text-sm text-default-500">Construisez et organisez vos séances d'entraînement personnalisées.</p>
            </CardBody>
          </Card>
        </div>

        <div className="text-center text-default-400 max-w-2xl mx-auto px-4 pb-8">
          <p>{t("homePage.description")}</p>
        </div>
      </section>
    </DefaultLayout>
  );
}
