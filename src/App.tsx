import React, { useCallback, useEffect, useState } from 'react'
import './App.css'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import EmailVerification from './pages/EmailVerification'
import Dashboard from './pages/firm/Dashboard'
import LoadBoard from './pages/firm/LoadBoard'
import TruckBoard from './pages/firm/TruckBoard'
import AdminConsole from './pages/firm/AdminConsole'
import Search from './pages/firm/Search'
import Profile from './pages/firm/Profile'
import Notifications from './pages/firm/Notifications'
import BusinessProfilePage from './pages/firm/BusinessProfile'
import ResetPassword from './pages/ResetPassword'
import { fetchAuthSession, signOut } from 'aws-amplify/auth'
import type { AuthSession } from 'aws-amplify/auth'
import AppLayout from './navigation/AppLayout'
import { LoadProvider } from './context/LoadContext'

// Check if the session is valid and not expired
const isSessionValid = (session: AuthSession | null): boolean => {
  if (!session?.tokens) return false;
  
  try {
    const accessToken = session.tokens.accessToken;
    if (!accessToken) return false;
    
    // Check if token is expired (with 5 minute buffer)
    const exp = accessToken.payload.exp;
    if (exp === undefined) return false;
    const now = Math.floor(Date.now() / 1000) - 300; // 5 min buffer
    return exp > now;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
};

// Custom hook for session management
const useAuthSession = (options: { requireAuth: boolean } = { requireAuth: false }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const currentSession = await fetchAuthSession();
      
      if (isSessionValid(currentSession)) {
        setSession(currentSession);
        setError(null);
        return true;
      }
      
      // If we get here, the session is invalid or expired
      await signOut();
      return false;
    } catch (err) {
      console.error('Session check failed:', err);
      setError(err instanceof Error ? err : new Error('Session check failed'));
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const verifyAndRefreshSession = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        const isValid = await checkSession();
        
        if (isMounted) {
          if (!isValid && options.requireAuth) {
            navigate('/login', { replace: true });
          }
          setLoading(false);
          
          // Schedule next check (every 5 minutes)
          timeoutId = setTimeout(verifyAndRefreshSession, 5 * 60 * 1000);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Session verification failed'));
          setLoading(false);
          if (options.requireAuth) {
            navigate('/login', { replace: true });
          }
        }
      }
    };

    verifyAndRefreshSession();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkSession, navigate, options.requireAuth]);

  return { session, loading, error };
};

// Redirect to dashboard if already signed in
function RedirectIfSignedIn({ children }: { children: React.ReactElement }) {
  const { loading } = useAuthSession();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const session = await fetchAuthSession();
        if (isMounted && isSessionValid(session)) {
          navigate('/firm', { replace: true });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (loading) return null;
  return children;
}

// Protect routes that require authentication
function RequireAuth({ children }: { children: React.ReactElement }) {
  const { session, loading } = useAuthSession({ requireAuth: true });

  if (loading) {
    return null; // Return null while loading to prevent layout shifts
  }

  return session ? children : <Navigate to="/login" replace />;
}

function App() {
  // No additional styling needed here; each page styles itself.
  return (
    <LoadProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Auth routes (no sidebar) */}
        <Route
          path="/login"
          element={
            <RedirectIfSignedIn>
              <Login />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfSignedIn>
              <Register />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/verify"
          element={
            <RedirectIfSignedIn>
              <EmailVerification />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/reset"
          element={
            <RedirectIfSignedIn>
              <ResetPassword />
            </RedirectIfSignedIn>
          }
        />

        {/* Protected routes with sidebar layout */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/firm" element={<Dashboard />} />
          <Route path="/firm/load-board" element={<LoadBoard />} />
          <Route path="/firm/truck-board" element={<TruckBoard />} />
          <Route path="/firm/admin" element={<AdminConsole />} />
          <Route path="/firm/search" element={<Search />} />
          <Route path="/firm/notifications" element={<Notifications />} />
          <Route path="/firm/profile" element={<Profile />} />
          <Route path="/firm/business-profile" element={<BusinessProfilePage />} />
        </Route>
      </Routes>
    </LoadProvider>
  )
}

export default App
