import { useQuery } from '@tanstack/react-query';
import { getActivity } from '@/services/activity.service';

export function useActivity(ticketId: string) {
  return useQuery({
    queryKey: ['activity', ticketId],
    queryFn: () => getActivity(ticketId),
    enabled: !!ticketId,
  });
}
