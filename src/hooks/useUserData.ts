import { useQuery } from '@tanstack/react-query';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Map stored role codes or legacy strings to display labels
const displayRole = (r: any): string => {
  const v = String(r ?? '').toUpperCase()
  if (v === 'SUPER_MANAGER') return 'Super Manager'
  if (v === 'MANAGER') return 'Manager'
  if (v === 'MEMBER') return 'Member'
  if (r === 'Admin') return 'Super Manager'
  if (r === 'Regular') return 'Member'
  if (r === 'Super Manager' || r === 'Manager' || r === 'Member') return String(r)
  return ''
}

// Attempt to fetch a model with graceful auth fallback
const tryList = async <T,>(fn: () => Promise<{ data?: T; errors?: any }>): Promise<T | undefined> => {
  try {
    const res = await fn()
    if ((res as any)?.errors?.length) return undefined
    return res.data
  } catch (e: any) {
    const msg = String(e?.message ?? e)
    if (/Not Authorized|Unauthorized|Missing credentials/i.test(msg)) return undefined
    return undefined
  }
}

export const useUserData = () => {
  const client = generateClient<Schema>();
  
  return useQuery({
    queryKey: ['userData'],
    queryFn: async () => {
      const attrs = await fetchUserAttributes();
      const first = (attrs.given_name || '').trim();
      const last = (attrs.family_name || '').trim();
      const emailRaw = (attrs.email || '').trim();
      const email = emailRaw.toLowerCase();
      
      // 1) Fetch role from User model by email
      let roleVal: string = '';
      const usersUL: any = await tryList(() => (client.models.User.list as any)({
        filter: { email: { eq: email } },
        limit: 1,
        authMode: 'userPool',
      }));
      
      let userRow: any = (Array.isArray(usersUL) ? usersUL[0] : usersUL?.[0]);
      if (!userRow) {
        const usersIL: any = await tryList(() => (client.models.User.list as any)({
          filter: { email: { eq: email } },
          limit: 1,
          authMode: 'identityPool',
        }));
        userRow = (Array.isArray(usersIL) ? usersIL[0] : usersIL?.[0]);
      }
      
      if (userRow?.role) {
        roleVal = displayRole(userRow.role);
      }

      // 2) Fetch company from Firm model
      const firmIdKey = 'c2b:myFirmId';
      let firmData: any | null = null;
      let persistedId: string | null = null;
      
      try { 
        persistedId = localStorage.getItem(firmIdKey); 
      } catch {}
      
      if (persistedId) {
        const byIdUL: any = await tryList(() => (client.models.Firm.list as any)({
          filter: { id: { eq: persistedId } }, 
          limit: 1, 
          authMode: 'userPool'
        }));
        firmData = (Array.isArray(byIdUL) ? byIdUL[0] : byIdUL?.[0]);
        
        if (!firmData) {
          const byIdIL: any = await tryList(() => (client.models.Firm.list as any)({
            filter: { id: { eq: persistedId } }, 
            limit: 1, 
            authMode: 'identityPool'
          }));
          firmData = (Array.isArray(byIdIL) ? byIdIL[0] : byIdIL?.[0]);
        }
      }
      
      if (!firmData && email) {
        const byEmailUL: any = await tryList(() => (client.models.Firm.list as any)({
          filter: { administrator_email: { eq: email } }, 
          limit: 1, 
          authMode: 'userPool'
        }));
        firmData = (Array.isArray(byEmailUL) ? byEmailUL[0] : byEmailUL?.[0]);
        
        if (!firmData) {
          const byEmailIL: any = await tryList(() => (client.models.Firm.list as any)({
            filter: { administrator_email: { eq: emailRaw } }, 
            limit: 1, 
            authMode: 'identityPool'
          }));
          firmData = (Array.isArray(byEmailIL) ? byEmailIL[0] : byEmailIL?.[0]);
        }
      }
      
      const companyName = String((firmData as any)?.firm_name || '').trim();
      
      return {
        userName: [first, last].filter(Boolean).join(' '),
        userEmail: emailRaw,
        userRole: roleVal,
        company: companyName
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: 1, // Only retry once if the query fails
  });
};
