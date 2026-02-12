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

import { title, subtitle } from "../components/primitives";
import DefaultLayout from "../layouts/default";

export default function IndexPage() {
  const { t } = useTranslation(["kdufoot", "base"]);

  return (
    <DefaultLayout maxWidth="max-w-full">
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 relative overflow-hidden">
        {/* Background Gradient */}


        <div className="inline-block max-w-4xl text-center justify-center relative z-10">
          <span className={title()}>{t("homePage.title.prefix")}&nbsp;</span>
          <span className={`${title()} bg-[linear-gradient(to_right,#3b82f6,#22c55e,#ec4899,#ef4444,#f97316,#eab308)] bg-clip-text text-transparent`}>{t("homePage.title.highlight")}&nbsp;</span>
          <br />
          <span className={title()}>{t("homePage.title.suffix")}</span>
          <div className={subtitle({ class: "mt-4" })}>
            {t("site.description")}
          </div>
        </div>

        <div className="flex gap-4 mt-4">
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

        <div className="mt-12 text-center text-default-500 max-w-5xl px-4">
          <p>{t("homePage.description")}</p>
        </div>
      </section>
    </DefaultLayout>
  );
}
