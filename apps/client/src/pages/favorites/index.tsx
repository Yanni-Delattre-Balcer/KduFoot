import DefaultLayout from "@/layouts/default";
import { useTranslation } from "react-i18next";
import { title } from "@/components/primitives";

export default function FavoritesPage() {
    const { t } = useTranslation();

    return (
        <DefaultLayout>
            <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
                <div className="inline-block max-w-lg text-center justify-center">
                    <h1 className={title()}>{t("nav.favorites")}</h1>
                    <p className="text-default-500 mt-4">
                        {t("favorites.comingSoon", "Coming soon...")}
                    </p>
                </div>
            </section>
        </DefaultLayout>
    );
}
