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
    const base = "font-bold hover:scale-105 transition-transform bg-size-[200%_auto] animate-gradient-flow bg-clip-text text-transparent";
    // Vibrant saturated colors (3 steps) to see movement without being "extreme"
    if (href === '/') return `${base} bg-[linear-gradient(to_right,#ef4444,#f87171,#ef4444)]`; // Red 🍎
    if (href === '/dashboard') return `${base} bg-[linear-gradient(to_right,#f97316,#fb923c,#f97316)]`; // Orange 🍊
    if (href === '/exercises') return `${base} bg-[linear-gradient(to_right,#f59e0b,#fbbf24,#f59e0b)]`; // Amber ☀️
    if (href === '/training') return `${base} bg-[linear-gradient(to_right,#10b981,#34d399,#10b981)]`; // Green 🌿
    if (href === '/favorites') return `${base} bg-[linear-gradient(to_right,#06b6d4,#22d3ee,#06b6d4)]`; // Cyan 💧
    if (href === '/sessions') return `${base} bg-[linear-gradient(to_right,#3b82f6,#60a5fa,#3b82f6)]`; // Royal Blue 📘
    if (href === '/matches') return `${base} bg-[linear-gradient(to_right,#8b5cf6,#a78bfa,#8b5cf6)]`; // Violet 🔮
    if (href === '/pricing') return `${base} bg-[linear-gradient(to_right,#d946ef,#f0abfc,#d946ef)]`; // Pink 💖
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
      <NavbarContent className="hidden lg:flex gap-8 justify-center w-full" justify="center">
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