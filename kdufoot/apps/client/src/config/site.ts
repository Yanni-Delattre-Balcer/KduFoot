/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

export type SiteConfig = typeof siteConfig;

export const siteConfig = () => ({
  name: "KduFoot",
  needCookieConsent: true,
  description: "site.description",
  navItems: [
    {
      label: "nav.home",
      href: "/",
    },
    {
      label: "nav.exercises",
      href: "/exercises",
    },
    {
      label: "nav.favorites",
      href: "/favorites",
    },
    {
      label: "nav.sessions",
      href: "/sessions",
    },
    {
      label: "nav.matches",
      href: "/matches",
    },
    {
      label: "nav.pricing",
      href: "/pricing",
    },
  ],
  navMenuItems: [
    {
      label: "nav.home",
      href: "/",
    },
    {
      label: "nav.exercises",
      href: "/exercises",
    },
    {
      label: "nav.favorites",
      href: "/favorites",
    },
    {
      label: "nav.sessions",
      href: "/sessions",
    },
    {
      label: "nav.matches",
      href: "/matches",
    },
    {
      label: "nav.pricing",
      href: "/pricing",
    },
    {
      label: "nav.profile",
      href: "/profile",
    },
    {
      label: "nav.admin",
      href: "/admin",
    },
  ],
  links: {
    github: "https://github.com/your-repo/kdufoot",
    twitter: "https://twitter.com/kdufoot",
    docs: "https://docs.kdufoot.com",
    discord: "https://discord.gg/kdufoot",
  },
});
