import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStatuses, createStatus } from '@/services/status.service';

export function useStatuses(projectId: string) {
  return useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => getStatuses(projectId),
    enabled: !!projectId,
  });
}

export function useCreateStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statuses', projectId] }),
  });
}
