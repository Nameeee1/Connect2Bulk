import { type ReactNode } from 'react';
import { type AlertPosition, type AlertVariant } from './Alert';
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
    id?: string;
}
export interface AlertAPI {
    show: (options: ShowAlertOptions) => {
        id: string;
        close: () => void;
    };
    success: (options: Omit<ShowAlertOptions, 'variant'>) => {
        id: string;
        close: () => void;
    };
    error: (options: Omit<ShowAlertOptions, 'variant'>) => {
        id: string;
        close: () => void;
    };
    info: (options: Omit<ShowAlertOptions, 'variant'>) => {
        id: string;
        close: () => void;
    };
    warning: (options: Omit<ShowAlertOptions, 'variant'>) => {
        id: string;
        close: () => void;
    };
    close: (id: string) => void;
    clear: () => void;
}
export declare function useAlert(): AlertAPI;
interface AlertProviderProps {
    children: ReactNode;
    defaultPosition?: AlertPosition;
    maxPerPosition?: number;
}
export declare function AlertProvider({ children, defaultPosition, maxPerPosition }: AlertProviderProps): import("react/jsx-runtime").JSX.Element;
export {};
