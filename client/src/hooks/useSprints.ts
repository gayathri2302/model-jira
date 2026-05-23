import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSprints, createSprint, startSprint, completeSprint } from '@/services/sprint.service';

export function useSprints(projectId: string) {
  return useQuery({ queryKey: ['sprints', projectId], queryFn: () => getSprints(projectId), enabled: !!projectId });
}
export function useCreateSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSprint,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints', projectId] }),
  });
}
export function useStartSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof startSprint>[1] }) => startSprint(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints', projectId] }),
  });
}
export function useCompleteSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dest }: { id: string; dest: string }) => completeSprint(id, dest),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sprints', projectId] }); qc.invalidateQueries({ queryKey: ['tickets', projectId] }); },
  });
}
