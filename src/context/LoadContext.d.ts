import React from 'react';
import type { ReactNode } from 'react';
interface LoadContextType {
    loadData: any[];
    setLoadData: React.Dispatch<React.SetStateAction<any[]>>;
    lastCreated: any | null;
    setLastCreated: React.Dispatch<React.SetStateAction<any | null>>;
    refreshToken: number;
    incrementRefreshToken: () => void;
}
export declare const LoadProvider: React.FC<{
    children: ReactNode;
}>;
export declare const useLoadContext: () => LoadContextType;
export {};
