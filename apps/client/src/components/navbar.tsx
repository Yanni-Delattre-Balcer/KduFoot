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

import { LinkUniversal } from "./link-universal";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import { link as linkStyles } from "@heroui/theme";
import { clsx } from "@heroui/shared-utils";



import { I18nIcon, LanguageSwitch } from "./language-switch";

import { LoginLogoutButton, LoginLogoutLink } from "@/authentication";
import { siteConfig } from "@/config/site";



import { availableLanguages } from "@/i18n";

export const Navbar = () => {

  const getNavItemClass = (href: string) => {
    const base = "font-bold hover:scale-105 transition-transform bg-size-[200%_auto] animate-gradient-flow bg-clip-text text-transparent text-base";
    // Vibrant saturated colors (3 steps) to see movement without being "extreme"
    if (href === '/') return `${base} bg-[linear-gradient(to_right,#991b1b,#f87171,#991b1b)]`; // Red 🍎
    if (href === '/dashboard') return `${base} bg-[linear-gradient(to_right,#9a3412,#fb923c,#9a3412)]`; // Orange 🍊
    if (href === '/exercises') return `${base} bg-[linear-gradient(to_right,#92400e,#fbbf24,#92400e)]`; // Amber ☀️
    if (href === '/training') return `${base} bg-[linear-gradient(to_right,#14532d,#22c55e,#14532d)]`; // Grass Green 🌳
    if (href === '/favorites') return `${base} bg-[linear-gradient(to_right,#164e63,#22d3ee,#164e63)]`; // Cyan 💧
    if (href === '/sessions') return `${base} bg-[linear-gradient(to_right,#1e3a8a,#3b82f6,#1e3a8a)]`; // Deep Blue 📘
    if (href === '/matches') return `${base} bg-[linear-gradient(to_right,#5b21b6,#a78bfa,#5b21b6)]`; // Violet 🔮
    if (href === '/pricing') return `${base} bg-[linear-gradient(to_right,#86198f,#f0abfc,#86198f)]`; // Pink 💖
    if (href === '/remerciements') return `${base} bg-[linear-gradient(to_right,#115e59,#2dd4bf,#115e59)]`; // Teal 🌊
    return "text-foreground font-bold";
  };

  return (
    <HeroUINavbar 
      maxWidth="full" 
      position="sticky" 
      isBlurred={false}
      className="h-16 lg:h-24 top-0 m-0! p-0! border-none shadow-none bg-background" 
      classNames={{
        wrapper: "max-w-full px-6 h-full relative flex items-center justify-between"
      }}
    >
      {/* Navigation Links - Centered */}
      <NavbarContent className="hidden lg:flex gap-4 justify-center w-full" justify="center">
        {siteConfig().navItems.map((item) => (
          <NavbarItem key={item.href}>
            <LinkUniversal
              className={clsx(
                linkStyles({ color: "foreground" }),
                getNavItemClass(item.href)
              )}
              color="foreground"
              href={item.href}
            >
              {item.label}
            </LinkUniversal>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-0 grow"
        justify="end"
      >
        <NavbarItem className="hidden sm:flex items-center gap-2">
          <LanguageSwitch
            availableLanguages={availableLanguages}
            icon={I18nIcon}
          />
          <LoginLogoutButton />
        </NavbarItem>


      </NavbarContent>

      <NavbarContent className="lg:hidden basis-1 pl-4" justify="end">
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu className="bg-background/95 backdrop-blur-md pt-6 border-t border-default-100">

        <LanguageSwitch
          availableLanguages={availableLanguages}
          icon={I18nIcon}
        />
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {siteConfig().navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <LinkUniversal
                className={getNavItemClass(item.href)}
                color="foreground"
                href={item.href}
                size="lg"
              >
                {item.label}
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
}