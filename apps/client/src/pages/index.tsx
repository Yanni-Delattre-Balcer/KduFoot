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

export default function IndexPage() {
  const { t } = useTranslation(["kdufoot", "base"]);

  return (
    <DefaultLayout maxWidth="max-w-full">
      <section className="flex flex-col gap-5 w-full px-4">

        {/* Hero Section with football field background */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/15 via-green-500/10 to-pink-500/10 border border-blue-500/20">
          {/* Grass stripes */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34,197,94,0.3) 40px, rgba(34,197,94,0.3) 80px)',
          }}></div>
          {/* Field center line + circle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5"></div>

          <div className="relative flex flex-col md:flex-row items-center gap-6 py-8 px-6">
            {/* Left: Title & CTA */}
            <div className="flex-1 flex flex-col items-center md:items-start gap-3 text-center md:text-left">
              <h1 className="text-3xl lg:text-4xl font-bold">
                <span className="bg-[linear-gradient(to_right,#3b82f6,#22c55e,#ec4899,#ef4444,#f97316,#eab308)] bg-clip-text text-transparent">Kdufoot</span>
                <span className="text-default-400 font-normal mx-2">›</span>
                <span className="text-foreground text-2xl lg:text-3xl">{t("homePage.title.highlight")}</span>
              </h1>
              <p className="text-default-500 text-base">
                {t("homePage.description")}
              </p>
              <div className="flex gap-3 mt-1">
                <Link
                  className={`${buttonStyles({
                    radius: "full",
                    variant: "shadow",
                    size: "lg",
                  })} bg-gradient-to-r from-blue-600 to-violet-600 text-white border-none`}
                  href="/exercises"
                >
                  {t("homePage.buttons.exercises")}
                </Link>
                <Link
                  className={`${buttonStyles({
                    radius: "full",
                    variant: "shadow",
                    size: "lg",
                  })} bg-gradient-to-r from-orange-500 to-amber-500 text-white border-none`}
                  href="/matches"
                >
                  {t("homePage.buttons.sessions")}
                </Link>
              </div>
            </div>

            {/* Right: Football Clock */}
            <div className="flex-shrink-0">
              <FootballClock size={140} />
            </div>
          </div>
        </div>

        {/* À propos - full width */}
        {/* À propos - full width */}
        <Card className="border border-default-200 overflow-hidden w-full">
          <CardBody className="p-5 flex flex-col gap-2">
            <h2 className="text-lg font-bold text-foreground">{t("homePage.about.title")}</h2>
            <p className="text-base text-default-500 leading-relaxed">
              <Trans
                i18nKey="kdufoot:homePage.about.intro"
                components={[
                  <strong className="text-foreground" key="0" />,
                  <a href="https://iut-bethune.univ-artois.fr/type-de-formation/reseaux-et-telecommunications/" target="_blank" rel="noopener noreferrer" className="text-foreground underline inline-flex items-center gap-1" key="1">text <svg aria-hidden="true" fill="none" focusable="false" height="1em" role="presentation" viewBox="0 0 24 24" width="1em" className="text-small"><path d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg></a>,
                  <strong className="text-foreground" key="2" />
                ]}
              />
            </p>
            <p className="text-base text-default-500 leading-relaxed">
              <Trans
                i18nKey="kdufoot:homePage.about.features"
                components={[
                  <strong className="text-primary" key="0" />,
                  <strong className="text-orange-500" key="1" />
                ]}
              />
            </p>
            <p className="text-sm text-default-400 italic">
              {t("homePage.about.footer")}
            </p>
          </CardBody>
        </Card>

        {/* 2 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-default-200 overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardBody className="relative p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h3 className="text-base font-bold">{t("homePage.cards.video.title")}</h3>
              <p className="text-xs text-default-500">{t("homePage.cards.video.description")}</p>
            </CardBody>
          </Card>

          <Card className="border border-default-200 overflow-hidden group hover:shadow-lg hover:shadow-orange-500/5 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardBody className="relative p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-orange-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <h3 className="text-base font-bold">{t("homePage.cards.match.title")}</h3>
              <p className="text-xs text-default-500">{t("homePage.cards.match.description")}</p>
            </CardBody>
          </Card>
        </div>
      </section>
    </DefaultLayout>
  );
}
