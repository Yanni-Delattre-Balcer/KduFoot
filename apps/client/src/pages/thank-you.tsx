/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import { Trans, useTranslation } from "react-i18next";
import { Link } from "@heroui/link";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";

import { title } from "@/components/primitives";
import { StarIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";

export default function ThankYouPage() {
  const { t } = useTranslation();

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-2 py-2 md:py-4">
        <div className="inline-block max-w-2xl text-center justify-center">
          <h1 className={title({ size: "sm" })}>
            <Trans t={t}>thank-you.title</Trans>
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-2xl px-4">
          {/* Ronan Le Meillat */}
          <Card className="p-4 border border-teal-500/20 bg-teal-500/5">
            <CardHeader className="flex gap-2 py-2">
              <div className="flex flex-col">
                <p className="text-xl font-bold">
                  <Trans t={t}>thank-you.ronan.name</Trans>
                </p>
                <p className="text-small text-default-500">
                  Expert Développement Web
                </p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="py-2">
              <p className="text-base mb-2">
                <Trans t={t}>thank-you.ronan.description</Trans>
              </p>
              <div className="p-3 bg-default-100 rounded-lg border border-default-200">
                <p className="font-semibold text-teal-600 dark:text-teal-400 mb-1">
                  <Trans t={t}>thank-you.ronan.support</Trans>
                </p>
                <div className="flex justify-center items-center gap-4 py-2">
                  <Link
                    isExternal
                    aria-label="SCTG Development Repositories"
                    className="p-1 transition-transform hover:scale-110 overflow-hidden"
                    href="https://github.com/orgs/sctg-development/repositories"
                  >
                    <img
                      alt="SCTG Logo"
                      className="w-16 h-16 object-contain"
                      src="/sctg-logo.png"
                    />
                  </Link>
                </div>
                <p className="text-xs italic text-default-600 mt-1 flex items-center gap-2">
                  <StarIcon className="text-warning" />
                  <Trans t={t}>thank-you.github.instructions</Trans>
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Philippe & Franck Dubart */}
          <Card className="p-4 border border-teal-500/20 bg-teal-500/5">
            <CardHeader className="flex gap-2 py-2 flex-col items-start">
              <div className="flex gap-2 items-center">
                <p className="text-lg font-bold">
                  <Trans t={t}>thank-you.philippe.name</Trans>
                </p>
                <span className="text-default-300">|</span>
                <p className="text-lg font-bold">
                  <Trans t={t}>thank-you.franck.name</Trans>
                </p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="py-2">
              <p className="text-sm text-default-700">
                <Trans t={t}>thank-you.family.description</Trans>
              </p>
            </CardBody>
          </Card>
        </div>
      </section>
    </DefaultLayout>
  );
}
