import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttachments, uploadAttachment, deleteAttachment } from '@/services/attachment.service';

export function useAttachments(ticketId: string) {
  return useQuery({
    queryKey: ['attachments', ticketId],
    queryFn: () => getAttachments(ticketId),
    enabled: !!ticketId,
  });
}

export function useUploadAttachment(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadAttachment(ticketId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', ticketId] }),
  });
}

export function useDeleteAttachment(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', ticketId] }),
  });
}
