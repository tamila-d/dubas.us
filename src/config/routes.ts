export const APP_ROUTES = {
  home: '/',
  card: '/card',
  about: '/about',
  portfolio: '/portfolio',
  portfolioItem: '/portfolio/:slug',
  store: '/store',
  storeItem: '/store/:slug',
  contact: '/contact',
  thankYou: '/thank-you',
  notFound: '*',
} as const

export const APP_ROUTE_IDS = {
  shell: 'app-shell',
} as const
