import { useTranslation } from "react-i18next";
import { Button } from "@heroui/button";
import { useAuth0 } from "@auth0/auth0-react";
import DefaultLayout from "@/layouts/default";

export const UnauthenticatedView = ({ title }: { title: string }) => {
  const { t } = useTranslation();
  const { loginWithRedirect } = useAuth0();

  return (
    <DefaultLayout maxWidth="max-w-full">
      <section className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-6">
        <div className="w-20 h-20 bg-cyan-500/10 text-cyan-500 rounded-full flex items-center justify-center transition-transform hover:scale-110 duration-500">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">
            {title}
          </h1>
          <p className="text-default-500 max-w-md mx-auto font-medium">
            {t(
              "favorites.unauthenticated_desc",
              "Veuillez vous connecter pour accéder à vos favoris et synchroniser vos données sur tous vos appareils.",
            )}
          </p>
        </div>
        <Button
          className="font-black h-12 px-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 transition-all rounded-2xl"
          onPress={() => loginWithRedirect()}
        >
          {t("data_wall.login", "Se connecter")}
        </Button>
      </section>
    </DefaultLayout>
  );
};

export default UnauthenticatedView;
