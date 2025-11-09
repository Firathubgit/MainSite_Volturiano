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
      primaryLabel: 'Explore the model',
      primaryTo: '/models',
      secondaryLabel: 'Configure now',
      secondaryTo: '/configurator'
    },
    sortOrder: 1
  },
  {
    id: 'volturiano-long',
    slug: 'volturiano-long',
    name: 'Volturiano Long',
    status: 'coming_soon',
    image: longCar,
    cta: {
      primaryLabel: 'Join waitlist',
      primaryTo: '/models'
    },
    sortOrder: 2
  },
  {
    id: 'volturiano-suv',
    slug: 'volturiano-suv',
    name: 'Volturiano SUV',
    status: 'coming_soon',
    image: suvCar,
    cta: {
      primaryLabel: 'Join waitlist',
      primaryTo: '/models'
    },
    sortOrder: 3
  }
];



