import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../i18n/en/common.json';
import enNav from '../i18n/en/nav.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, nav: enNav }
    },
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'nav'],
    defaultNS: 'common',
    interpolation: { escapeValue: false }
  });

export default i18n;

