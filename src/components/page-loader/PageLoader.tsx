import { PageSkeleton } from '@/components/loading/ContentSkeletons'

interface PageLoaderProps {
  label: string
}

export function PageLoader({ label }: PageLoaderProps) {
  return <PageSkeleton label={label} />
}
