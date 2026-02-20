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

const videoAnalysisRoutes = ["/exercises", "/training"];

export const siteConfig = () => {
  const allNavItems = [
    {
      label: i18next.t("nav.home"),
      href: "/",
    },
    {
      label: i18next.t("nav.exercises"),
      href: "/exercises",
    },
    {
      label: i18next.t("nav.training"),
      href: "/training",
    },
    {
      label: i18next.t("nav.favorites"),
      href: "/favorites",
    },
    {
      label: i18next.t("nav.sessions"),
      href: "/sessions",
    },
    {
      label: i18next.t("nav.matches"),
      href: "/matches",
    },
    {
      label: i18next.t("nav.pricing"),
      href: "/pricing",
    },
  ];

  const filteredNavItems = showVideoAnalysis
    ? allNavItems
    : allNavItems.filter((item) => !videoAnalysisRoutes.includes(item.href));

  return ({
  name: "KduFoot",
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
});
};
