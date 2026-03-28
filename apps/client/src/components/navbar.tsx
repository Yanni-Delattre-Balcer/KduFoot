/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
## Phase 9: Navbar Refinement
- [/] 1. Increase Navbar height and center logo/menu vertically
- [/] 2. Ensure logo size is appropriate (+20/30%)
- [ ] 3. Verify safe area compliance on mobile
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { useState, useEffect } from "react";
import { clsx } from "@heroui/shared-utils";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import { link as linkStyles } from "@heroui/theme";
import { Chip } from "@heroui/chip";

import { I18nIcon, LanguageSwitch } from "./language-switch";
import { LinkUniversal } from "./link-universal";

import {
  LoginLogoutButton,
  LoginLogoutLink,
} from "@/authentication/auth-components";
import { siteConfig } from "@/config/site";
import { availableLanguages } from "@/i18n";
import { useIncomingRequests, useMyParticipations } from "@/hooks/use-matches";

export const Navbar = () => {
  const { t } = useTranslation();
  const { pendingCount } = useIncomingRequests();
  const { modifiedCount } = useMyParticipations();
  const totalCount = pendingCount + modifiedCount;

  // Badge Logic: totalCount is derived from hooks above
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    setIsMenuOpen(false);

    // If already on the same page, just close the menu (HeroUI might need a slight delay or explicit close)
    if (location.pathname === href) {
      // Menu already closing via setIsMenuOpen(false)
      return;
    }

    if (href.startsWith("/matches") && location.pathname === "/matches") {
      e.preventDefault();
      const params = new URLSearchParams(location.search);

      params.set("scroll_ts", Date.now().toString());
      navigate(`/matches?${params.toString()}`, { replace: true });
    }
  };

  const getNavItemClass = (href: string) => {
    const base =
      "font-bold hover:scale-105 transition-transform bg-size-[200%_auto] animate-gradient-flow bg-clip-text text-transparent text-base";

    if (href === "/")
      return `${base} bg-[linear-gradient(to_right,#991b1b,#f87171,#991b1b)]`;
    if (href === "/dashboard")
      return `${base} bg-[linear-gradient(to_right,#9a3412,#fb923c,#9a3412)]`;
    if (href === "/exercises")
      return `${base} bg-[linear-gradient(to_right,#92400e,#fbbf24,#92400e)]`;
    if (href === "/training")
      return `${base} bg-[linear-gradient(to_right,#14532d,#22c55e,#14532d)]`;
    if (href === "/favorites")
      return `${base} bg-[linear-gradient(to_right,#164e63,#22d3ee,#164e63)]`;
    if (href === "/sessions")
      return `${base} bg-[linear-gradient(to_right,#1e3a8a,#3b82f6,#1e3a8a)]`;
    if (href.startsWith("/matches"))
      return `${base} bg-[linear-gradient(to_right,#5b21b6,#a78bfa,#5b21b6)]`;
    if (href === "/pricing")
      return `${base} bg-[linear-gradient(to_right,#86198f,#f0abfc,#86198f)]`;
    if (href === "/remerciements")
      return `${base} bg-[linear-gradient(to_right,#115e59,#2dd4bf,#115e59)]`;

    return "text-foreground font-bold";
  };

  return (
    <HeroUINavbar
      className={`bg-background/80 backdrop-blur-md z-50 transition-all duration-300 border-b border-white/5 ${
        isScrolled ? "shadow-lg shadow-black/20" : "shadow-none"
      }`}
      classNames={{
        wrapper: "h-16 lg:h-20 max-w-7xl mx-auto px-4 sm:px-6",
      }}
      isBlurred={false}
      isMenuOpen={isMenuOpen}
      maxWidth="full"
      position="sticky"
      onMenuOpenChange={setIsMenuOpen}
    >
      {/* Brand/Logo Section */}
      <div className="flex items-center gap-2">
        <a
          aria-label={t("common:home", "Accueil")}
          className="flex items-center active:scale-95 transition-transform"
          href="/"
        >
          <img
            alt="KduFoot Logo"
            className="h-10 lg:h-12 w-auto object-contain"
            src="/logo.png"
          />
          <span className="ml-2 text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent hidden sm:block">
            Kdufoot
          </span>
        </a>
      </div>

      <NavbarContent
        className="hidden lg:flex gap-8 justify-center"
        justify="center"
      >
        {siteConfig().navItems.map((item) => (
          <NavbarItem key={item.href}>
            <LinkUniversal
              className={clsx(
                linkStyles({ color: "foreground" }),
                getNavItemClass(item.href),
              )}
              color="foreground"
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
            >
              <div className="flex items-center gap-1.5">
                {item.label}
                {item.href === "/dashboard" && totalCount > 0 && (
                  <Chip
                    className="h-4 min-w-[18px] px-1 text-xs font-extrabold animate-bounce shadow-lg shadow-danger/40 border border-white/20"
                    color="danger"
                    size="sm"
                    variant="solid"
                  >
                    {totalCount}
                  </Chip>
                )}
              </div>
            </LinkUniversal>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:flex gap-3">
          <LanguageSwitch
            availableLanguages={availableLanguages}
            icon={I18nIcon}
          />
          <LoginLogoutButton />
        </NavbarItem>

        <NavbarItem className="sm:hidden flex items-center pr-2">
          <LanguageSwitch
            availableLanguages={availableLanguages}
            icon={I18nIcon}
          />
        </NavbarItem>

        <NavbarMenuToggle
          className="sm:hidden w-10 h-10 rounded-lg bg-default-100 flex items-center justify-center"
          icon={(isOpen) => (
            <div className="flex flex-col items-center justify-center gap-1.5 w-6 h-6">
              <span
                className={`block h-0.5 w-5 rounded-full bg-foreground transition-all ${isOpen ? "rotate-45 translate-y-2" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-foreground transition-all ${isOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-foreground transition-all ${isOpen ? "-rotate-45 -translate-y-2" : ""}`}
              />
            </div>
          )}
        />
      </NavbarContent>

      <NavbarMenu className="bg-background/95 backdrop-blur-md pt-20 border-t border-default-100">
        <div className="mx-4 flex flex-col gap-2">
          {siteConfig().navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <LinkUniversal
                className={getNavItemClass(item.href)}
                color="foreground"
                href={item.href}
                size="lg"
                onClick={(e) => handleNavClick(e, item.href)}
              >
                <div className="flex items-center gap-2">
                  {item.label}
                  {item.href === "/dashboard" && totalCount > 0 && (
                    <Chip
                      className="h-5 font-black animate-bounce"
                      color="danger"
                      size="sm"
                      variant="solid"
                    >
                      {totalCount}
                    </Chip>
                  )}
                </div>
              </LinkUniversal>
            </NavbarMenuItem>
          ))}
          <NavbarMenuItem key="login-logout">
            <LoginLogoutLink color="danger" />
          </NavbarMenuItem>
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
