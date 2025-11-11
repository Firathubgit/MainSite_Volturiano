import mainCar from '../../assets/showroom/ShowroomCarVOLTURIANO1.png';
import longCar from '../../assets/showroom/ShowroomLongCar.png';
import suvCar from '../../assets/showroom/SHowroomSUV.png';

// Local fallback data. Supabase (if configured) will override this at runtime.
export const showroomLocal = [
  {
    id: 'volturiano-main',
    slug: 'volturiano',
    name: 'Volturiano',
    status: 'available',
    image: mainCar,
    cta: {
      primaryLabelKey: 'showroom:cta.explore',
      primaryLabel: 'Explore the model',
      primaryTo: '/models',
      secondaryLabelKey: 'showroom:cta.configure',
      secondaryLabel: 'Configure now',
      secondaryTo: '/configurator'
    },
    sortOrder: 1
  },
  {
    id: 'volturiano-long',
    slug: 'volturiano-long',
    name: 'Volturiano Long',
    status: 'coming-soon',
    image: longCar,
    cta: {
      primaryLabelKey: 'showroom:cta.waitlist',
      primaryLabel: 'Join waitlist',
      primaryTo: '/models'
    },
    sortOrder: 2
  },
  {
    id: 'volturiano-suv',
    slug: 'volturiano-suv',
    name: 'Volturiano SUV',
    status: 'coming-soon',
    image: suvCar,
    cta: {
      primaryLabelKey: 'showroom:cta.waitlist',
      primaryLabel: 'Join waitlist',
      primaryTo: '/models'
    },
    sortOrder: 3
  }
];



