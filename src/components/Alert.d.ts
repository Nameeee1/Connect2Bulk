export type AlertVariant = 'success' | 'error' | 'info' | 'warning';
export type AlertPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
export interface AlertProps {
    open: boolean;
    variant?: AlertVariant;
    title?: string;
    message?: React.ReactNode;
    icon?: React.ReactNode;
    autoClose?: boolean;
    autoCloseDuration?: number;
    pauseOnHover?: boolean;
    closable?: boolean;
    onClose?: () => void;
    position?: AlertPosition;
    action?: React.ReactNode;
    role?: 'alert' | 'status';
    id?: string;
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
export default function Alert({ open, variant, title, message, icon, autoClose, autoCloseDuration, pauseOnHover, closable, onClose, position, action, role, id, inline, }: AlertProps): import("react/jsx-runtime").JSX.Element | null;
