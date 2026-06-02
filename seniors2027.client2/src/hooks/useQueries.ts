import { useQuery } from '@tanstack/react-query'
import { getMeRequest, type MeUser } from '../lib/authApi'
import { getUnreadCountRequest } from '../lib/notificationApi'

export function useCurrentUser() {
  return useQuery<MeUser | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const result = await getMeRequest()
      return result.ok ? (result.data ?? null) : null
    },
    staleTime: 5 * 60 * 1000
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['unreadNotificationCount'],
    queryFn: async () => {
      const result = await getUnreadCountRequest()
      return result.ok ? (result.data?.count ?? 0) : 0
    },
    staleTime: 30 * 1000
  })
}
