/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// @ts-ignore
import LanguageDetector from 'i18next-browser-languagedetector';
// @ts-ignore
import Backend from 'i18next-http-backend';

export interface AvailableLanguage {
  code: string;
  nativeName: string;
  isRTL: boolean;
}

export const availableLanguages: AvailableLanguage[] = [
  { code: "en-US", nativeName: "English", isRTL: false },
  { code: "fr-FR", nativeName: "Français", isRTL: false },
  { code: "es-ES", nativeName: "Español", isRTL: false },
  { code: "zh-CN", nativeName: "中文", isRTL: false },
  { code: "ar-SA", nativeName: "العربية", isRTL: true },
  { code: "he-IL", nativeName: "עברית", isRTL: true },
];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr-FR',
    supportedLngs: availableLanguages.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    defaultNS: 'kdufoot',
    ns: ['base', 'kdufoot'],
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{ns}}/{{lng}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', (lng) => {
  const isRTL = availableLanguages.find(l => l.code === lng)?.isRTL || false;
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.documentElement.lang = lng;
});

export default i18n;
