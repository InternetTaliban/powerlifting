import { useEffect, useRef } from 'react';
import type { ReactNode, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { closeModal } from '../../store/actions';

interface ModalProps {
  id: string;
  className?: string;
  onClose?: () => void;
  children: ReactNode;
}

export function Modal({ id, className, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  const close = onClose || closeModal;

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) {
      el.showModal();
    }
    return () => {
      if (el && el.open) {
        el.close();
      }
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    el.addEventListener('cancel', onCancel);
    return () => el.removeEventListener('cancel', onCancel);
  }, [close]);

  const isOutside = (e: { clientX: number; clientY: number }) => {
    const el = ref.current;
    if (!el) {
      return false;
    }
    const r = el.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDialogElement>) => {
    pressedOutside.current = e.target === ref.current && isOutside(e);
  };

  const onClick = (e: ReactMouseEvent<HTMLDialogElement>) => {
    if (pressedOutside.current && e.target === ref.current && isOutside(e)) {
      close();
    }
    pressedOutside.current = false;
  };

  return (
    <dialog id={id} className={className} ref={ref} onPointerDown={onPointerDown} onClick={onClick}>
      {children}
    </dialog>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="close-btn" type="button" onClick={onClick} aria-label="Close">
      ×
    </button>
  );
}
