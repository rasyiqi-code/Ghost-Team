import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CatalogProvider } from '@/types'

/**
 * Hook untuk mengambil katalog provider dari models.dev.
 * Cache 24 jam. Dipakai di onboarding & settings.
 */
export function useModelsCatalog() {
  return useQuery<{ providers: CatalogProvider[] }>({
    queryKey: ['models-catalog'],
    queryFn: () => api.get('/settings/models-catalog', { silent: true }),
    staleTime: 24 * 3600 * 1000,
  })
}
