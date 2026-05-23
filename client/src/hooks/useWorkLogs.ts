import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkLogs, getProjectWorkLogs, createWorkLog, updateWorkLog, deleteWorkLog } from '@/services/workLog.service';

export function useWorkLogs(ticketId: string) {
  return useQuery({ queryKey: ['worklogs', ticketId], queryFn: () => getWorkLogs(ticketId), enabled: !!ticketId });
}
export function useProjectWorkLogs(projectId: string) {
  return useQuery({ queryKey: ['worklogs-project', projectId], queryFn: () => getProjectWorkLogs(projectId), enabled: !!projectId });
}
export function useCreateWorkLog(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createWorkLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worklogs', ticketId] }),
  });
}
export function useUpdateWorkLog(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateWorkLog>[1] }) => updateWorkLog(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worklogs', ticketId] }),
  });
}
export function useDeleteWorkLog(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worklogs', ticketId] }),
  });
}
