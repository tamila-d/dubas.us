export const APP_ROUTES = {
  home: '/',
  card: '/card',
  crop: '/crop',
  cropItem: '/crop/:id',
  about: '/about',
  portfolio: '/originals',
  portfolioItem: '/originals/:id',
  store: '/store',
  storeItem: '/store/:slug',
  commissions: '/commissions',
  contact: '/contact',
  thankYou: '/thank-you',
  notFound: '*',
} as const

export const APP_ROUTE_IDS = {
  shell: 'app-shell',
} as const
