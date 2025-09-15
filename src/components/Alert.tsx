import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { regionPositionCSS } from './alertPosition';

export type AlertVariant = 'success' | 'error' | 'info' | 'warning';
export type AlertPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

export interface AlertProps {
  open: boolean;
  variant?: AlertVariant;
  title?: string;
  message?: React.ReactNode;
  icon?: React.ReactNode;
  autoClose?: boolean;
  autoCloseDuration?: number; // ms
  pauseOnHover?: boolean;
  closable?: boolean;
  onClose?: () => void;
  position?: AlertPosition;
  // Optional: render a custom action (e.g., Undo button)
  action?: React.ReactNode;
  // Accessibility overrides
  role?: 'alert' | 'status';
  id?: string;
  // When true, renders only the Toast (no portal/region). Used by AlertProvider for stacking.
  inline?: boolean;
}

/**
 * Alert (toast-like popup)
 * - Variants: success | error | info | warning
 * - Auto close with optional progress bar
 * - Pause on hover, close on Escape, optional close button
 * - Positions: corners + center top/bottom
 * - Uses a portal to body
 */
export default function Alert({
  open,
  variant = 'info',
  title,
  message,
  icon,
  autoClose = false,
  autoCloseDuration = 4000,
  pauseOnHover = true,
  closable = true,
  onClose,
  position = 'top-right',
  action,
  role,
  id,
  inline,
}: AlertProps) {
  const [mounted, setMounted] = useState(open);
  const [exiting, setExiting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingRef = useRef<number>(autoCloseDuration);

  // Keep internal mount state in sync with `open` while allowing exit animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
    } else if (mounted) {
      // trigger exit animation then unmount
      setExiting(true);
      const t = window.setTimeout(() => {
        setMounted(false);
        setExiting(false);
      }, 220); // match exit animation duration
      return () => window.clearTimeout(t);
    }
  }, [open, mounted]);

  // Auto close timer with pause/resume on hover
  useEffect(() => {
    if (!mounted || !autoClose) return;

    const startTimer = (ms: number) => {
      startTimeRef.current = Date.now();
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        if (onClose) onClose();
      }, ms) as unknown as number;
    };

    // Start timer
    startTimer(remainingRef.current);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [mounted, autoClose, onClose]);

  // Pause/resume on hover
  useEffect(() => {
    if (!autoClose || !pauseOnHover) return;
    if (!mounted) return;

    if (hovered) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        const elapsed = Date.now() - startTimeRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      }
    } else {
      // resume
      if (!timeoutRef.current && remainingRef.current > 0) {
        startTimeRef.current = Date.now();
        timeoutRef.current = window.setTimeout(() => {
          timeoutRef.current = null;
          if (onClose) onClose();
        }, remainingRef.current) as unknown as number;
      }
    }
  }, [hovered, autoClose, pauseOnHover, mounted, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, closable, onClose]);

  const ariaRole: 'alert' | 'status' = useMemo(() => {
    if (role) return role;
    return variant === 'error' || variant === 'warning' ? 'alert' : 'status';
  }, [role, variant]);

  const defaultIcon = useMemo(() => {
    switch (variant) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" fill="currentColor" opacity=".15"/>
            <path d="m7.75 12 2.75 2.75 5.75-5.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" fill="currentColor" opacity=".15"/>
            <path d="M15.5 8.5 8.5 15.5M8.5 8.5l7 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 3 22 21H2L12 3Z" fill="currentColor" opacity=".15"/>
            <path d="M12 9v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15"/>
            <path d="M12 8v8M12 6.5v0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        );
    }
  }, [variant]);

  if (!mounted) return null;

  const toastBody = (
    <Toast
      id={id}
      role={ariaRole}
      aria-atomic="true"
      $variant={variant}
      $exiting={exiting}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Content>
        <Icon $variant={variant} aria-hidden>
          {icon ?? defaultIcon}
        </Icon>
        {title && <Title>{title}</Title>}
        {message && <Message>{message}</Message>}
        {action && <ActionWrap>{action}</ActionWrap>}
      </Content>
      {closable && (
        <CloseButton onClick={onClose} aria-label="Close">
          <span aria-hidden>×</span>
        </CloseButton>
      )}
      {autoClose && (
        <Progress $duration={autoCloseDuration} $paused={hovered} $variant={variant} />
      )}
    </Toast>
  );

  if (inline) {
    return toastBody;
  }

  return createPortal(
    <ToastRegion $position={position} aria-live={ariaRole === 'alert' ? 'assertive' : 'polite'}>
      {toastBody}
    </ToastRegion>,
    document.body
  );
}

// styled-components (below the component, at module scope)
const enter = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const exit = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px); }
`;

// subtle attention pulse for the icon
const iconPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

const variantColors: Record<AlertVariant, { bg: string; fg: string; accent: string }> = {
  success: { bg: '#1f2937', fg: '#e6fff3', accent: '#198754' },
  error: { bg: '#1f2937', fg: '#ffe6ea', accent: '#dc3545' },
  info: { bg: '#1f2937', fg: '#e6f0ff', accent: '#0d6efd' },
  warning: { bg: '#1f2937', fg: '#fff7e6', accent: '#ffc107' },
};

const ToastRegion = styled.div<{ $position: AlertPosition }>`
  position: fixed;
  z-index: 1000;
  pointer-events: none; /* container doesn't catch clicks */
  display: flex;
  width: min(560px, 96vw);
  ${p => regionPositionCSS(p.$position)}
`;

const Toast = styled.div<{ $variant: AlertVariant; $exiting: boolean }>`
  pointer-events: auto; /* toast itself is interactive */
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: start;
  background: ${p => variantColors[p.$variant].bg};
  color: ${p => variantColors[p.$variant].fg};
  border: 1px solid ${p => variantColors[p.$variant].accent}33;
  border-radius: 10px;
  padding: 12px 12px 14px 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  min-width: 280px;
  max-width: 560px;
  animation: ${p => (p.$exiting ? exit : enter)} 0.22s ease-out;
`;

const Icon = styled.div<{ $variant: AlertVariant }>`
  color: ${p => variantColors[p.$variant].accent};
  display: inline-flex;
  width: 40px;
  height: 40px;
  margin-bottom: 6px;
  justify-self: center;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
  transform-origin: center;
  will-change: transform;
  animation: ${iconPulse} 1.4s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  svg { width: 100%; height: 100%; display: block; }
`;

const Content = styled.div`
  display: grid;
  gap: 4px;
`;

const Title = styled.div`
  font-weight: 700;
  line-height: 1.2;
  font-size: 0.95rem;
`;

const Message = styled.div`
  line-height: 1.4;
  font-size: 0.9rem;
  opacity: 0.95;
`;

const ActionWrap = styled.div`
  margin-top: 6px;
`;

const CloseButton = styled.button`
  appearance: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  padding: 0 2px;
  margin-left: 8px;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s ease;
  &:hover { opacity: 1; }
`;

const progressAnim = (_durationMs: number) => keyframes`
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
`;

const Progress = styled.div<{ $duration: number; $paused: boolean; $variant: AlertVariant }>`
  grid-column: 1 / -1;
  height: 3px;
  border-radius: 2px;
  background: ${p => variantColors[p.$variant].accent}66;
  transform-origin: left center;
  animation: ${p => progressAnim(p.$duration)} linear;
  animation-duration: ${p => p.$duration}ms;
  animation-play-state: ${p => (p.$paused ? 'paused' : 'running')};
`;
