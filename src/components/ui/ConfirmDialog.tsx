'use client';

import Modal from './Modal';
import { Button } from './Button';

/**
 * Destructive-action confirmation. Replaces four near-identical hand-built
 * delete modals (products, categories, banners, newsletter), which had drifted
 * apart in copy, layout and button order.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  eyebrow = 'Please confirm',
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  tone = 'danger',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eyebrow?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: 'danger' | 'solid';
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="font-sans text-[13px] leading-relaxed text-muted">{message}</p>
    </Modal>
  );
}
