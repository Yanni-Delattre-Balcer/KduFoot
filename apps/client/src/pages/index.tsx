/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";
import { useTranslation } from "react-i18next";

import { title, subtitle } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";

export default function IndexPage() {
  const { t } = useTranslation(["kdufoot", "base"]);

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <span className={title()}>{t("homePage.title.prefix")}&nbsp;</span>
          <span className={title({ color: "violet" })}>{t("homePage.title.highlight")}&nbsp;</span>
          <br />
          <span className={title()}>{t("homePage.title.suffix")}</span>
          <div className={subtitle({ class: "mt-4" })}>
            {t("site.description")}
          </div>
        </div>

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
            href="/sessions"
          >
            {t("homePage.buttons.sessions")}
          </Link>
        </div>

        <div className="mt-12 text-center text-default-500 max-w-2xl px-4">
          <p>{t("homePage.description")}</p>
        </div>
      </section>
    </DefaultLayout>
  );
}
