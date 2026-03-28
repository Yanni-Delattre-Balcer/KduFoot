import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarBrand,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import { Chip } from "@heroui/chip";

import { I18nIcon, LanguageSwitch } from "./language-switch";
import { LinkUniversal } from "./link-universal";

import {
  LoginLogoutButton,
  LoginLogoutLink,
} from "@/authentication/auth-components";
import { availableLanguages } from "@/i18n";
import { useIncomingRequests, useMyParticipations } from "@/hooks/use-matches";

export const Navbar = () => {
  const { t } = useTranslation();
  const { pendingCount } = useIncomingRequests();
  const { modifiedCount } = useMyParticipations();
  const totalCount = pendingCount + modifiedCount;

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
    if (location.pathname === href) return;

    if (href.startsWith("/matches") && location.pathname === "/matches") {
      e.preventDefault();
      const params = new URLSearchParams(location.search);

      params.set("scroll_ts", Date.now().toString());
      navigate(`/matches?${params.toString()}`, { replace: true });
    }
  };

  const getNavItemClass = (href: string) => {
    const base =
      "font-bold hover:scale-105 transition-transform bg-size-[200%_auto] animate-gradient-flow bg-clip-text text-transparent text-sm lg:text-base";

    if (href === "/")
      return `${base} bg-[linear-gradient(to_right,#991b1b,#f87171,#991b1b)]`;
    if (href === "/dashboard")
      return `${base} bg-[linear-gradient(to_right,#9a3412,#fb923c,#9a3412)]`;
    if (href === "/favorites")
      return `${base} bg-[linear-gradient(to_right,#164e63,#22d3ee,#164e63)]`;
    if (href.startsWith("/matches"))
      return `${base} bg-[linear-gradient(to_right,#5b21b6,#a78bfa,#5b21b6)]`;
    if (href === "/remerciements")
      return `${base} bg-[linear-gradient(to_right,#115e59,#2dd4bf,#115e59)]`;

    return "text-foreground font-bold";
  };

  const navLinks = [
    { label: t("nav.home", "Accueil"), href: "/" },
    { label: t("nav.dashboard", "Tableau de Bord"), href: "/dashboard" },
    { label: t("nav.favorites"), href: "/favorites" },
    {
      label: t("nav.mega_menu", "Créer/Trouver un match/tournoi"),
      href: "/matches",
    },
    { label: t("nav.remerciements"), href: "/remerciements" },
  ];

  return (
    <div
      className="fixed top-0 left-0 right-0 z-99999 pointer-events-none"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        transform: "translate3d(0,0,0)",
        WebkitTransform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <div className="pointer-events-auto">
        <HeroUINavbar
          className={`bg-black transition-all duration-300 border-b border-white/5 ${
            isScrolled ? "h-16 shadow-lg shadow-black/20" : "h-20 shadow-none"
          }`}
          classNames={{
            wrapper: "h-full max-w-full mx-auto px-4 sm:px-6",
          }}
          isBlurred={false}
          isMenuOpen={isMenuOpen}
          maxWidth="full"
          position="static"
          onMenuOpenChange={setIsMenuOpen}
        >
          {/* Brand/Logo Section - Left */}
          <NavbarContent justify="start">
            <NavbarBrand>
              <a
                aria-label={t("common:home", "Accueil")}
                className="flex items-center active:scale-95 transition-transform"
                href="/"
              >
                <img
                  alt="KduFoot Logo"
                  className="h-13 lg:h-14 w-auto object-contain"
                  src="/logo.png"
                />
              </a>
            </NavbarBrand>
          </NavbarContent>

          {/* Navigation - Center */}
          <NavbarContent
            className="hidden lg:flex gap-6 grow justify-center"
            justify="center"
          >
            {navLinks.map((item) => (
              <NavbarItem key={item.href}>
                <LinkUniversal
                  className={getNavItemClass(item.href)}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {item.label}
                    {item.href === "/dashboard" && totalCount > 0 && (
                      <Chip
                        className="h-4 min-w-[18px] px-1 text-[10px] font-black animate-bounce bg-red-600 text-white border-none"
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

          {/* User Actions - Right */}
          <NavbarContent justify="end">
            <div className="flex items-center bg-white/5 rounded-2xl px-2 lg:px-4 py-1 gap-2 border border-white/5">
              <LanguageSwitch
                availableLanguages={availableLanguages}
                icon={I18nIcon}
              />
              <div className="h-4 w-px bg-white/10 hidden lg:block" />
              <div className="hidden lg:flex items-center">
                <LoginLogoutButton />
              </div>
            </div>

            <NavbarMenuToggle
              className="lg:hidden w-10 h-10 rounded-lg bg-default-100 flex items-center justify-center ml-2"
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

          <NavbarMenu className="bg-black/95 backdrop-blur-md pt-24">
            <div className="mx-4 flex flex-col gap-2">
              {navLinks.map((item, index) => (
                <NavbarMenuItem key={`${item.href}-${index}`}>
                  <LinkUniversal
                    className={getNavItemClass(item.href)}
                    href={item.href}
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
      </div>
    </div>
  );
};
