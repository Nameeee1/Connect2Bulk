import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import Alert, { type AlertPosition, type AlertVariant } from './Alert';
import { regionPositionCSS } from './alertPosition';

export interface ShowAlertOptions {
  variant?: AlertVariant;
  title?: string;
  message?: ReactNode;
  icon?: ReactNode;
  autoClose?: boolean;
  autoCloseDuration?: number;
  pauseOnHover?: boolean;
  closable?: boolean;
  action?: ReactNode;
  position?: AlertPosition;
  role?: 'alert' | 'status';
  id?: string; // optional custom id
}

export interface AlertAPI {
  show: (options: ShowAlertOptions) => { id: string; close: () => void };
  success: (options: Omit<ShowAlertOptions, 'variant'>) => { id: string; close: () => void };
  error: (options: Omit<ShowAlertOptions, 'variant'>) => { id: string; close: () => void };
  info: (options: Omit<ShowAlertOptions, 'variant'>) => { id: string; close: () => void };
  warning: (options: Omit<ShowAlertOptions, 'variant'>) => { id: string; close: () => void };
  close: (id: string) => void;
  clear: () => void;
}

const AlertContext = createContext<AlertAPI | null>(null);

export function useAlert(): AlertAPI {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return ctx;
}

interface AlertProviderProps {
  children: ReactNode;
  // Optional global defaults
  defaultPosition?: AlertPosition;
  maxPerPosition?: number; // if exceeded, drop the oldest
}

interface AlertRecord extends Required<ShowAlertOptions> {
  id: string;
  open: boolean;
  createdAt: number;
}

const defaultOptions: Required<Omit<ShowAlertOptions,
  'title' | 'message' | 'icon' | 'action' | 'id' | 'role'>> &
  Pick<ShowAlertOptions, 'role'> = {
  variant: 'info',
  autoClose: false,
  autoCloseDuration: 4000,
  pauseOnHover: true,
  closable: true,
  position: 'top-right',
  role: undefined,
};

export function AlertProvider({ children, defaultPosition = 'top-right', maxPerPosition = 6 }: AlertProviderProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const removeTimers = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    if (removeTimers.current[id]) {
      window.clearTimeout(removeTimers.current[id]);
      delete removeTimers.current[id];
    }
  }, []);

  const scheduleRemoveAfterExit = useCallback((id: string) => {
    // delay to allow Alert exit animation (~220ms)
    if (removeTimers.current[id]) return;
    removeTimers.current[id] = window.setTimeout(() => remove(id), 260);
  }, [remove]);

  const clampByMax = useCallback((list: AlertRecord[], position: AlertPosition) => {
    const byPos = list.filter(a => a.position === position);
    if (byPos.length <= maxPerPosition) return list;
    // drop the oldest in this position
    const oldest = byPos.reduce((min, a) => (a.createdAt < min.createdAt ? a : min), byPos[0]);
    return list.filter(a => a.id !== oldest.id);
  }, [maxPerPosition]);

  const show = useCallback((opts: ShowAlertOptions) => {
    const id = opts.id ?? `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const rec: AlertRecord = {
      id,
      open: true,
      createdAt: Date.now(),
      title: opts.title ?? '',
      message: opts.message ?? null,
      icon: opts.icon ?? null,
      action: opts.action ?? null,
      role: opts.role || 'alert',
      variant: opts.variant ?? defaultOptions.variant,
      autoClose: opts.autoClose ?? defaultOptions.autoClose,
      autoCloseDuration: opts.autoCloseDuration ?? defaultOptions.autoCloseDuration,
      pauseOnHover: opts.pauseOnHover ?? defaultOptions.pauseOnHover,
      closable: opts.closable ?? defaultOptions.closable,
      position: opts.position ?? defaultPosition,
    };

    setAlerts(prev => clampByMax([...prev, rec], rec.position));

    const close = () => {
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, open: false } : a)));
      scheduleRemoveAfterExit(id);
    };

    return { id, close };
  }, [clampByMax, defaultPosition, scheduleRemoveAfterExit]);

  const close = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, open: false } : a)));
    scheduleRemoveAfterExit(id);
  }, [scheduleRemoveAfterExit]);

  const clear = useCallback(() => {
    // close all, then remove after exit
    setAlerts(prev => {
      prev.forEach(a => scheduleRemoveAfterExit(a.id));
      return prev.map(a => ({ ...a, open: false }));
    });
  }, [scheduleRemoveAfterExit]);

  const api: AlertAPI = useMemo(() => ({
    show,
    success: (o) => show({ ...o, variant: 'success' }),
    error: (o) => show({ ...o, variant: 'error' }),
    info: (o) => show({ ...o, variant: 'info' }),
    warning: (o) => show({ ...o, variant: 'warning' }),
    close,
    clear,
  }), [show, close, clear]);

  const positions: AlertPosition[] = useMemo(() => [
    'top-left', 'top-center', 'top-right',
    'bottom-left', 'bottom-center', 'bottom-right',
  ], []);

  return (
    <AlertContext.Provider value={api}>
      {children}

      {positions.map(pos => {
        const items = alerts.filter(a => a.position === pos);
        if (items.length === 0) return null;
        // For top regions, newest last (so appears on top); for bottom, reverse
        const isTop = pos.startsWith('top');
        const ordered = [...items].sort((a, b) => a.createdAt - b.createdAt);
        const list = isTop ? ordered : ordered.reverse();

        return (
          <Region key={pos} $position={pos}>
            <Stack $top={isTop}>
              {list.map(a => (
                <Item key={a.id}>
                  <Alert
                    inline
                    open={a.open}
                    variant={a.variant}
                    title={a.title || undefined}
                    message={a.message}
                    icon={a.icon || undefined}
                    autoClose={a.autoClose}
                    autoCloseDuration={a.autoCloseDuration}
                    pauseOnHover={a.pauseOnHover}
                    closable={a.closable}
                    role={a.role}
                    // In inline mode, Alert doesn't use its own position
                    onClose={() => close(a.id)}
                    action={a.action}
                  />
                </Item>
              ))}
            </Stack>
          </Region>
        );
      })}
    </AlertContext.Provider>
  );
}

// styled-components (below the component, at module scope)
const Region = styled.div<{ $position: AlertPosition }>`
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  display: flex;
  width: min(560px, 96vw);
  ${p => regionPositionCSS(p.$position)}
`;

const Stack = styled.div<{ $top: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  pointer-events: none; /* only toasts should receive events */
`;

const Item = styled.div`
  pointer-events: auto;
`;
