import { APP_ROUTES } from '@/config/routes'

const phoneUserAgentPattern =
  /Android.*Mobile|iPhone|iPod|IEMobile|Windows Phone|webOS|BlackBerry|Opera Mini|Mobi/i

interface DeviceIdentity {
  mobileClientHint?: boolean
  userAgent: string
}

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: {
    mobile?: boolean
  }
}

export function entryRouteForDevice({
  mobileClientHint,
  userAgent,
}: DeviceIdentity): string {
  const phone =
    mobileClientHint === true ||
    (mobileClientHint === undefined && phoneUserAgentPattern.test(userAgent))

  return phone ? APP_ROUTES.card : APP_ROUTES.portfolio
}

export function browserEntryRoute(): string {
  const browserNavigator = navigator as NavigatorWithUserAgentData

  return entryRouteForDevice({
    mobileClientHint: browserNavigator.userAgentData?.mobile,
    userAgent: browserNavigator.userAgent,
  })
}
