/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

export type SiteConfig = typeof siteConfig;
import i18next from "../i18n";

export const siteConfig = () => ({
  name: "KduFoot",
  needCookieConsent: true,
  description: i18next.t("site.description"),
  navItems: [
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
  ],
  navMenuItems: [
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
  ],
  links: {
    github: "https://github.com/your-repo/kdufoot",
    twitter: "https://twitter.com/kdufoot",
    docs: "https://docs.kdufoot.com",
    discord: "https://discord.gg/kdufoot",
  },
});
