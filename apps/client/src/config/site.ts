/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

export type SiteConfig = typeof siteConfig;
import i18next from "../i18n";

export const showVideoAnalysis =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".local") ||
    window.location.hostname.includes("192.168."));

export const siteConfig = () => {
  const allNavItems = [
    {
      label: i18next.t("nav.home"),
      href: "/",
    },
    {
      label: i18next.t("nav.dashboard", "Tableau de Bord"),
      href: "/dashboard",
    },
    {
      label: i18next.t("nav.favorites"),
      href: "/favorites",
    },
    {
      label: i18next.t("nav.find", "Trouver"),
      href: "/matches?type=match",
    },
    {
      label: i18next.t("nav.create", "Créer un match"),
      href: "/matches/create",
    },
    {
      label: i18next.t("nav.tournament", "Tournoi"),
      href: "/matches?type=tournament",
    },
    {
      label: i18next.t("nav.remerciements"),
      href: "/remerciements",
    },
  ];

  const filteredNavItems = allNavItems;

  return {
    name: "Kdufoot",
    needCookieConsent: true,
    description: i18next.t("site.description"),
    navItems: filteredNavItems,
    navMenuItems: filteredNavItems,
    links: {
      github: "https://github.com/your-repo/kdufoot",
      twitter: "https://twitter.com/kdufoot",
      docs: "https://docs.kdufoot.com",
      discord: "https://discord.gg/kdufoot",
    },
  };
};
