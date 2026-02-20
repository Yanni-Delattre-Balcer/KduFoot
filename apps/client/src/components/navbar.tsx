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
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import { link as linkStyles } from "@heroui/theme";
import { clsx } from "@heroui/shared-utils";
import { useTranslation } from "react-i18next";


import { I18nIcon, LanguageSwitch } from "./language-switch";

import { LoginLogoutButton, LoginLogoutLink } from "@/authentication";
import { siteConfig } from "@/config/site";


import { Logo } from "@/components/icons";
import { availableLanguages } from "@/i18n";

export const Navbar = () => {
  const { t } = useTranslation();
  const getNavItemClass = (href: string) => {
    if (href === '/') return "bg-linear-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent font-bold";
    if (href === '/exercises') return "bg-linear-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent font-bold";
    if (href === '/training') return "bg-linear-to-r from-[#17c964] to-[#12a150] bg-clip-text text-transparent font-bold";
    if (href === '/favorites') return "bg-linear-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent font-bold";
    if (href === '/sessions') return "bg-linear-to-r from-red-500 to-rose-600 bg-clip-text text-transparent font-bold";
    if (href === '/matches') return "bg-linear-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent font-bold";
    if (href === '/pricing') return "bg-linear-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent font-bold";
    return "text-foreground font-medium";
  };

  return (
    <HeroUINavbar 
      maxWidth="full" 
      position="sticky" 
      className="h-20" 
      classNames={{
        wrapper: "max-w-full px-4" // Remplace px-0 par px-4 si tu veux un tout petit peu d'air, ou px-0 pour coller complètement
      }}
    >
      <NavbarContent className="basis-0 grow" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
          <LinkUniversal
            className="flex justify-start items-center gap-1"
            color="foreground"
            href="/"
          >
            <Logo />
            <p className="font-bold bg-linear-to-r from-orange-500 via-yellow-400 to-fuchsia-600 bg-clip-text text-transparent">{t("brand.name")}</p>
          </LinkUniversal>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden lg:flex" justify="center">
        <div className="flex gap-4 justify-center">
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
        </div>
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

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
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