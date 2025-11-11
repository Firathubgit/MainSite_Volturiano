import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../i18n/en/common.json';
import enNav from '../i18n/en/nav.json';
import enHome from '../i18n/en/home.json';
import enStart from '../i18n/en/start.json';
import enModels from '../i18n/en/models.json';
import enConfigurator from '../i18n/en/configurator.json';
import enShowroom from '../i18n/en/showroom.json';
import enAccount from '../i18n/en/account.json';
import enWorld from '../i18n/en/world.json';
import enInvestor from '../i18n/en/investor.json';
import svCommon from '../i18n/sv/common.json';
import svNav from '../i18n/sv/nav.json';
import svHome from '../i18n/sv/home.json';
import svStart from '../i18n/sv/start.json';
import svModels from '../i18n/sv/models.json';
import svConfigurator from '../i18n/sv/configurator.json';
import svShowroom from '../i18n/sv/showroom.json';
import svAccount from '../i18n/sv/account.json';
import svWorld from '../i18n/sv/world.json';
import svInvestor from '../i18n/sv/investor.json';

const STORAGE_KEY = 'volt_language';

const storedLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
const initialLanguage = storedLanguage || 'en';

const languageLabels = {
  en: 'English',
  sv: 'Swedish'
};

let previousLanguage = initialLanguage;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        nav: enNav,
        home: enHome,
        start: enStart,
        models: enModels,
        configurator: enConfigurator,
        showroom: enShowroom,
        account: enAccount,
        world: enWorld,
        investor: enInvestor
      },
      sv: {
        common: svCommon,
        nav: svNav,
        home: svHome,
        start: svStart,
        models: svModels,
        configurator: svConfigurator,
        showroom: svShowroom,
        account: svAccount,
        world: svWorld,
        investor: svInvestor
      }
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    ns: [
      'common',
      'nav',
      'home',
      'start',
      'models',
      'configurator',
      'showroom',
      'account',
      'world',
      'investor'
    ],
    defaultNS: 'common',
    interpolation: { escapeValue: false }
  });

i18n.on('languageChanged', (lng) => {
  const prevLabel = languageLabels[previousLanguage] || previousLanguage;
  const nextLabel = languageLabels[lng] || lng;

  console.log(`[i18n] Language changed from ${prevLabel} to ${nextLabel}`);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, lng);
  }

  previousLanguage = lng;
});

export default i18n;

