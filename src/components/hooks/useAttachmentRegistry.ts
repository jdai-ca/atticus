import { useCallback } from 'react';
import { Attachment, AttachmentMeta } from '../../types';

interface UseAttachmentRegistryParams {
  readonly attachmentDataRef: React.MutableRefObject<Map<string, string>>;
}

interface UseAttachmentRegistryResult {
  readonly registerAttachments: (attachments: readonly Attachment[]) => AttachmentMeta[];
}

export function useAttachmentRegistry({
  attachmentDataRef,
}: UseAttachmentRegistryParams): UseAttachmentRegistryResult {
  const registerAttachments = useCallback(
    (attachments: readonly Attachment[]): AttachmentMeta[] =>
      attachments.map(({ data, id, name, type, size }): AttachmentMeta => {
        attachmentDataRef.current.set(id, data);
        return { id, name, type, size } satisfies AttachmentMeta;
      }),
    [attachmentDataRef]
  );

  return {
    registerAttachments,
  } satisfies UseAttachmentRegistryResult;
}
