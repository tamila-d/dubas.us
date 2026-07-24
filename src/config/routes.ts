export const APP_ROUTES = {
  home: '/',
  card: '/card',
  crop: '/crop',
  cropItem: '/crop/:id',
  about: '/about',
  portfolio: '/portfolio',
  portfolioItem: '/portfolio/:id',
  store: '/store',
  storeItem: '/store/:slug',
  contact: '/contact',
  thankYou: '/thank-you',
  notFound: '*',
} as const

export const APP_ROUTE_IDS = {
  shell: 'app-shell',
} as const
