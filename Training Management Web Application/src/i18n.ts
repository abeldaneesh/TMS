import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en/translation.json';
import mlTranslations from './locales/ml/translation.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: enTranslations },
            ml: { translation: mlTranslations },
        },
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already safe from XSS
        },
    });

export default i18n;
