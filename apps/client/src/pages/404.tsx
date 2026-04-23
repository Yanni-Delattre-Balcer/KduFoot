/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const PageNotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-12 animate-appearance-in">
        <svg
          className="w-64 h-64 sm:w-80 sm:h-80 opacity-20"
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect height="100%" style={{ fill: "transparent" }} width="100%" />
          <text
            dominantBaseline="middle"
            fill="currentColor"
            fontFamily="Arial"
            fontSize="120"
            fontWeight="bold"
            textAnchor="middle"
            x="50%"
            y="55%"
          >
            404
          </text>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <h1 className="text-4xl sm:text-6xl font-black text-white">LOST</h1>
          <p className="text-default-500 font-medium tracking-widest uppercase">
            Perdu • Perdido • Verloren
          </p>
        </div>
      </div>

      <div className="max-w-md space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold">
          {t("error.404_title", "Cette page n'existe pas ou a été déplacée.")}
        </h2>
        <p className="text-default-400">
          {t(
            "error.404_desc",
            "Il semblerait que vous ayez dribblé un peu trop loin du terrain.",
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            className="font-bold h-12 px-8 rounded-2xl bg-white text-black hover:bg-default-100 transition-all"
            onPress={() => navigate("/")}
          >
            {t("error_boundary.go_home", "Retour à l'accueil")}
          </Button>
          <Button
            className="font-bold h-12 px-8 rounded-2xl border-white/20 hover:bg-white/5 transition-all"
            variant="bordered"
            onPress={() => navigate(-1)}
          >
            {t("common.back", "Page précédente")}
          </Button>
        </div>
      </div>
    </div>
  );
};
