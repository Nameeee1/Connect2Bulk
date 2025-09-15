import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Define the shape of our context data
interface LoadContextType {
  loadData: any[];
  setLoadData: React.Dispatch<React.SetStateAction<any[]>>;
  lastCreated: any | null;
  setLastCreated: React.Dispatch<React.SetStateAction<any | null>>;
  refreshToken: number;
  incrementRefreshToken: () => void;
}

// Create the context with default values
const LoadContext = createContext<LoadContextType>({
  loadData: [],
  setLoadData: (() => {}) as React.Dispatch<React.SetStateAction<any[]>>,
  lastCreated: null,
  setLastCreated: (() => {}) as React.Dispatch<React.SetStateAction<any | null>>,
  refreshToken: 0,
  incrementRefreshToken: () => {},
});

// Create a provider component
export const LoadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadData, setLoadData] = useState<any[]>([]);
  const [lastCreated, setLastCreated] = useState<any | null>(null);
  const [refreshToken, setRefreshToken] = useState<number>(0);

  const incrementRefreshToken = () => {
    setRefreshToken((prev) => {
      const next = prev + 1;
      console.debug('[LoadContext] Increment refreshToken to', next);
      return next;
    });
  };

  return (
    <LoadContext.Provider
      value={{
        loadData,
        setLoadData,
        lastCreated,
        setLastCreated,
        refreshToken,
        incrementRefreshToken,
      }}
    >
      {children}
    </LoadContext.Provider>
  );
};

// Create a custom hook for using this context
export const useLoadContext = () => useContext(LoadContext);
