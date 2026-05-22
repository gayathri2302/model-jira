import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTicketsByProject,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
} from '@/services/ticket.service';

export function useTickets(projectId: string) {
  return useQuery({
    queryKey: ['tickets', projectId],
    queryFn: () => getTicketsByProject(projectId),
    enabled: !!projectId,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id),
    enabled: !!id,
  });
}

export function useCreateTicket(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets', projectId] }),
  });
}

export function useUpdateTicket(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTicket>[1] }) =>
      updateTicket(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tickets', projectId] });
      if (updated) qc.setQueryData(['ticket', updated.id], updated);
    },
  });
}

export function useDeleteTicket(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets', projectId] }),
  });
}
