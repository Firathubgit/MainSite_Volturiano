import { Box, Layers, Monitor, Layout, Database } from 'lucide-react';

export const SERVICES = [
  {
    id: 'luxury-ui-design',
    title: 'Luxury UI Design',
    description: 'Premium user interface and user experience design focused on elegance.',
    features: ['Dark Mode Aesthetics', 'Smooth Animations', 'Accessibility (WCAG)', 'Brand Consistency'],
    icon: Layout,
  },
  {
    id: 'fullstack-websites',
    title: 'Fullstack Websites',
    description: 'Complete web applications from frontend to backend built for performance.',
    features: ['React/Next.js Architecture', 'Supabase Integration', 'SEO Optimized', 'High Performance'],
    icon: Layers,
  },
  {
    id: '3d-configurators',
    title: '3D Configurators',
    description: 'Interactive 3D product configurators for e-commerce with real-time rendering.',
    features: ['Real-time WebGL rendering', 'Mobile-responsive', 'Custom integrations', 'Photo-realistic materials'],
    icon: Box,
  },
  {
    id: 'admin-dashboards',
    title: 'Admin Dashboards',
    description: 'Comprehensive admin panels and content management systems.',
    features: ['Role-based Access', 'Real-time Analytics', 'Data Visualization', 'Intuitive UX'],
    icon: Monitor,
  },
  {
    id: 'supabase-backends',
    title: 'Supabase Backends',
    description: 'Scalable backend infrastructure using Supabase for modern apps.',
    features: ['PostgreSQL Database', 'Edge Functions', 'Real-time Subscriptions', 'Secure Auth'],
    icon: Database,
  },
];

export const BUDGET_RANGES = [
  "$5k-$10k", "$10k-$25k", "$25k-$50k", "$50k-$100k", "$100k+", "Custom"
];

export const TIMELINES = [
  "1-2 months", "3-4 months", "5-6 months", "6+ months", "Flexible"
];

export const TIMEZONES = [
  "UTC", "EST (UTC-5)", "PST (UTC-8)", "CET (UTC+1)", "GMT (UTC+0)"
];















