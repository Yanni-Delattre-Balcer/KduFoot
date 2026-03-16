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

import { LoginLogoutButton, LoginLogoutLink } from "@/authentication";
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
      className={`fixed top-0 left-0 right-0 m-0! p-0! bg-background/80 backdrop-blur-sm z-50 transition-all duration-500 pt-[env(safe-area-inset-top,20px)] lg:pt-0 h-[calc(70px+env(safe-area-inset-top,20px))] lg:h-[70px] ${
        isScrolled
          ? "shadow-lg shadow-black/30 border-b border-default-200/50"
          : "border-none shadow-none"
      }`}
      classNames={{
        wrapper: "h-full items-end pb-2 lg:items-center lg:pb-0 px-0",
        content: "h-full items-end pb-2 lg:items-center lg:pb-0",
      }}
      isBlurred={false}
      isMenuOpen={isMenuOpen}
      maxWidth="full"
      position="sticky"
      onMenuOpenChange={setIsMenuOpen}
    >
      {/* Absolute Logo - Stays on the same line as nav items but far left */}
      <div className="absolute left-1 h-full flex items-end pb-2 lg:items-center lg:pb-0 z-[60]">
        <a
          aria-label={t("common:home", "Accueil")}
          className="flex items-center active:scale-95 transition-transform"
          href="/"
        >
          <img
            alt="KduFoot Logo"
            className="h-14 lg:h-16 w-auto object-contain"
            src="/logo.png"
          />
        </a>
      </div>

      <NavbarContent
        className="hidden lg:flex gap-6 w-full justify-center h-full items-center"
        justify="center"
      >
        {siteConfig().navItems.map((item) => (
          <NavbarItem key={item.href} className="h-full flex items-center">
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
                    className="h-4 min-w-[18px] px-1 text-xs sm:text-sm font-extrabold animate-bounce shadow-lg shadow-danger/40 border border-white/20"
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

      <NavbarContent
        className="hidden sm:flex basis-0 h-full items-end pb-6 lg:items-center lg:pb-0"
        justify="end"
      >
        <NavbarItem className="hidden sm:flex flex items-end pb-1 lg:items-center lg:pb-0 gap-2 h-full">
          <LanguageSwitch
            availableLanguages={availableLanguages}
            icon={I18nIcon}
          />
          <LoginLogoutButton />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent
        className="flex basis-1 items-end justify-end pr-1 h-full pb-2"
        justify="end"
      >
        <NavbarItem className="sm:hidden flex items-end pb-1">
          <LanguageSwitch
            availableLanguages={availableLanguages}
            icon={I18nIcon}
          />
        </NavbarItem>
        <NavbarMenuToggle
          className="w-12 h-12 rounded-xl bg-default-100 border border-default-200/60 flex items-center justify-center tap-highlight-transparent active:scale-90 transition-transform"
          icon={(isOpen) => (
            <div className="flex flex-col items-center justify-center gap-[5px] w-6 h-6">
              <span
                className={`block h-[3px] w-6 rounded-full bg-foreground transition-all duration-300 ${isOpen ? "rotate-45 translate-y-[8px]" : ""}`}
              />
              <span
                className={`block h-[3px] w-6 rounded-full bg-foreground transition-all duration-300 ${isOpen ? "opacity-0 scale-0" : ""}`}
              />
              <span
                className={`block h-[3px] w-6 rounded-full bg-foreground transition-all duration-300 ${isOpen ? "-rotate-45 -translate-y-[8px]" : ""}`}
              />
            </div>
          )}
          srOnlyText="Menu"
        />
      </NavbarContent>

      <NavbarMenu className="bg-background/95 backdrop-blur-md pt-6 border-t border-default-100">
        <div className="mx-4 mt-2 flex flex-col gap-2">
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
