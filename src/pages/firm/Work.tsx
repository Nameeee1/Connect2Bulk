import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useAlert } from '../../components/AlertProvider';

type FirmEntity = {
  id?: string | null;
  firm_name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  administrator_email?: string | null;
  administrator_first_name?: string | null;
  administrator_last_name?: string | null;
  state?: string | null;
  zip?: string | null;
  firm_type?: string | null;
  dba?: string | null;
  dot?: string | null;
  mc?: string | null;
  ein?: string | null;
  phone?: string | null;
  website?: string | null;
  insurance_provider?: string | null;
  policy_number?: string | null;
  policy_expiry?: string | null;
  w9_on_file?: boolean | null;
  brand_color?: string | null;
  notes?: string | null;
  load_posts?: number | null;
  truck_posts?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const Work: React.FC = () => {
  const alertApi = useAlert();
  const client = useMemo(() => generateClient<Schema>(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [userEmail, setUserEmail] = useState('');
  const [userFirst, setUserFirst] = useState('');
  const [userLast, setUserLast] = useState('');
  const [firm, setFirm] = useState<FirmEntity | null>(null);

  const firmIdKey = 'c2b:myFirmId';

  const saveFirmId = (id?: string | null) => {
    try {
      if (id) localStorage.setItem(firmIdKey, id);
    } catch {}
  };

  const readFirmId = (): string | null => {
    try {
      return localStorage.getItem(firmIdKey);
    } catch {
      return null;
    }
  };

  // Auth-mode resilient Firm.list
  const tryListFirms = async (params: any) => {
    try {
      return await client.models.Firm.list({ ...params, authMode: 'userPool' } as any);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/Not Authorized|Unauthorized|Missing credentials/i.test(msg)) {
        return await client.models.Firm.list({ ...params, authMode: 'identityPool' } as any);
      }
      throw e;
    }
  };

  // Resolve firm id from User model when linked
  const resolveFirmIdFromUser = async (email: string): Promise<string | undefined> => {
    if (!email) return undefined;
    try {
      try {
        const { data, errors } = await client.models.User.list({ authMode: 'userPool' } as any);
        if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
        const me = (data as any[])?.find((u: any) => String(u?.email || '').trim().toLowerCase() === email);
        return me?.firm_id ? String(me.firm_id) : undefined;
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        const isAuth = /Not Authorized|Unauthorized|Missing credentials/i.test(msg);
        const isEnumSerialize = /serialize value|Invalid input for Enum/i.test(msg);
        if (isAuth) {
          const { data, errors } = await client.models.User.list({ authMode: 'identityPool' } as any);
          if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
          const me = (data as any[])?.find((u: any) => String(u?.email || '').trim().toLowerCase() === email);
          return me?.firm_id ? String(me.firm_id) : undefined;
        }
        if (isEnumSerialize) {
          const { data } = await (client.models.User.list as any)({ selectionSet: ['id','email','firm_id'], authMode: 'userPool' });
          const me = (data as any[])?.find((u: any) => String(u?.email || '').trim().toLowerCase() === email);
          return me?.firm_id ? String(me.firm_id) : undefined;
        }
        throw err;
      }
    } catch {
      return undefined;
    }
  };

  // Helper: fetch Firm by email with small retry loop (handles eventual consistency & case mismatch)
  const fetchFirmByEmail = async (
    normalizedEmail: string,
    rawEmail?: string,
    retries = 3
  ): Promise<FirmEntity | null> => {
    for (let i = 0; i < retries; i += 1) {
      const { data: firms, errors } = await tryListFirms({ filter: { administrator_email: { eq: normalizedEmail } }, limit: 1 });
      if (!errors?.length && firms && firms.length > 0) return firms[0];
      if (rawEmail && rawEmail !== normalizedEmail) {
        const { data: firmsRaw, errors: errorsRaw } = await tryListFirms({ filter: { administrator_email: { eq: rawEmail } }, limit: 1 });
        if (!errorsRaw?.length && firmsRaw && firmsRaw.length > 0) return firmsRaw[0];
      }
      // wait a moment and try again
      await new Promise((r) => setTimeout(r, 350));
    }
    return null;
  };

  const load = async () => {
    setLoading(true);
    try {
      const attrs = await fetchUserAttributes();
      const emailRaw = (attrs.email || '').trim();
      const email = emailRaw.toLowerCase();
      const first = (attrs.given_name || '').trim();
      const last = (attrs.family_name || '').trim();
      setUserEmail(emailRaw);
      setUserFirst(first);
      setUserLast(last);

      // Prefer fetching by a persisted Firm ID if we have one
      const persistedId = readFirmId();
      if (persistedId) {
        const byIdList = await tryListFirms({ filter: { id: { eq: persistedId } }, limit: 1 });
        if (!byIdList.errors?.length && byIdList.data?.[0]) {
          const candidate = byIdList.data[0] as FirmEntity;
          const adminEmail = (candidate as any)?.administrator_email?.toLowerCase?.() || '';
          if (adminEmail && adminEmail === email) {
            setFirm(candidate);
            return;
          }
        }
      }

      // If not persisted or mismatch, try linked firm via User.firm_id
      if (email) {
        const linkedId = await resolveFirmIdFromUser(email);
        if (linkedId) {
          const byLinked = await tryListFirms({ filter: { id: { eq: linkedId } }, limit: 1 });
          if (!byLinked.errors?.length && byLinked.data?.[0]) {
            const found = byLinked.data[0] as FirmEntity;
            setFirm(found);
            saveFirmId(found.id as any);
            return;
          }
        }
      }

      if (email) {
        // Try normalized first, then raw as fallback (covers older records with mixed-case emails)
        const found = await fetchFirmByEmail(email, emailRaw, 2);
        if (found) {
          setFirm(found);
          saveFirmId(found.id);
        } else {
          // Avoid clearing UI due to eventual consistency; keep existing firm if present
          if (firm) {
            setTimeout(async () => {
              const retry = await fetchFirmByEmail(email, emailRaw, 4);
              if (retry) {
                setFirm(retry);
                saveFirmId(retry.id as any);
              }
            }, 700);
          } else {
            setFirm(null);
          }
        }
      } else {
        setFirm(null);
      }
    } catch (err) {
      console.error('Failed to load work info:', err);
      alertApi.error({
        title: 'Failed to load work info',
        message: (err as any)?.message ?? 'An unexpected error occurred.',
      });
      setFirm(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const createFirm = async () => {
    if (!userEmail) {
      alertApi.info({
        title: 'Email not available',
        message: 'Your account email is required to create a Firm record. Please set it in the Personal tab.',
      });
      return;
    }
    setCreating(true);
    try {
      const normalized = userEmail.trim().toLowerCase();
      const localFirm: FirmEntity = {
        id: '', // placeholder for immediate UI; real record fetched below
        firm_name: '',
        address: '',
        administrator_email: normalized,
        administrator_first_name: userFirst || '',
        administrator_last_name: userLast || '',
        state: '',
        zip: '',
        firm_type: 'Other',
        load_posts: 0,
        truck_posts: 0,
        createdAt: '',
        updatedAt: '',
      };

      // Optimistically reflect in UI
      setFirm(localFirm);

      const res = await client.models.Firm.create({
        firm_name: '',
        address: '',
        city: '',
        country: 'USA',
        administrator_email: normalized,
        administrator_first_name: localFirm.administrator_first_name,
        administrator_last_name: localFirm.administrator_last_name,
        state: '',
        zip: '',
        firm_type: 'Other',
        // Extended business fields with safe defaults
        dba: '',
        dot: '',
        mc: '',
        ein: '',
        phone: '',
        website: '',
        insurance_provider: '',
        policy_number: '',
        policy_expiry: '',
        w9_on_file: false,
        brand_color: '#0d6efd',
        notes: '',
        // Counters
        load_posts: 0,
        truck_posts: 0,
      });
      alertApi.success({
        title: 'Firm created',
        message: 'A new Firm record was created and linked to your profile.',
      });
      // Strongest consistency: fetch by ID if available
      const createdId = (res as any)?.data?.id as string | undefined;
      if (createdId) {
        const byIdList = await tryListFirms({ filter: { id: { eq: createdId } }, limit: 1 });
        if (!byIdList.errors?.length && byIdList.data?.[0]) {
          const foundById = byIdList.data[0] as FirmEntity;
          setFirm(foundById);
          saveFirmId(foundById.id);
          return;
        }
      }
      // Prefer persisted fetch (with retries) to ensure we reflect the stored record
      const found = await fetchFirmByEmail(normalized, userEmail, 4);
      if (found) {
        setFirm(found);
        saveFirmId(found.id);
      }
      else if (res && (res as any).data) {
        const data = (res as any).data as FirmEntity;
        setFirm(data);
        const newId = (data as any)?.id as string | undefined;
        if (newId) saveFirmId(newId);
      }
      else {
        // Do not clear the optimistic firm from UI; inform user and retry in background
        alertApi.info({
          title: 'Syncing…',
          message: 'We are finalizing your Firm in the backend. Please tap Refresh in a few seconds if it doesn’t appear.',
        });
        setTimeout(async () => {
          const retry = await fetchFirmByEmail(normalized, userEmail, 4);
          if (retry) {
            setFirm(retry);
            saveFirmId(retry.id);
          }
        }, 800);
      }
    } catch (err) {
      console.error('Failed to create Firm:', err);
      alertApi.error({
        title: 'Failed to create Firm',
        message: (err as any)?.message ?? 'An unexpected error occurred.',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Work</Title>
        <Actions>
          <Secondary type="button" onClick={refresh} aria-busy={refreshing} disabled={loading || refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Secondary>
          {!firm && (
            <Primary type="button" onClick={createFirm} disabled={creating || loading}>
              {creating ? 'Creating…' : 'Create Firm'}
            </Primary>
          )}
        </Actions>
      </Header>

      {loading ? (
        <Muted>Loading your work information…</Muted>
      ) : firm ? (
        <Grid>
          <Card>
            <CardHeader>
              <CardTitle>Firm Overview</CardTitle>
            </CardHeader>
            <CardBody>
              <FieldRow>
                <FieldLabel>Firm Name</FieldLabel>
                <FieldValue>{firm.firm_name || <Em>Not set</Em>}</FieldValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>Firm Type</FieldLabel>
                <FieldValue>{firm.firm_type || <Em>Not set</Em>}</FieldValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>Administrator</FieldLabel>
                <FieldValue>
                  {(firm.administrator_first_name || userFirst) || (firm.administrator_last_name || userLast)
                    ? `${firm.administrator_first_name || userFirst} ${firm.administrator_last_name || userLast}`.trim()
                    : <Em>Not set</Em>}
                  <br />
                  <Small>{firm.administrator_email || userEmail || '—'}</Small>
                </FieldValue>
              </FieldRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardBody>
              <FieldRow>
                <FieldLabel>Address</FieldLabel>
                <FieldValue>{firm.address || <Em>Not set</Em>}</FieldValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>State</FieldLabel>
                <FieldValue>{firm.state || <Em>Not set</Em>}</FieldValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>ZIP</FieldLabel>
                <FieldValue>{firm.zip || <Em>Not set</Em>}</FieldValue>
              </FieldRow>
            </CardBody>
          </Card>

          <Card $span2>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardBody>
              <Stats>
                <Stat>
                  <StatNumber>{firm.load_posts ?? 0}</StatNumber>
                  <StatLabel>Load Posts</StatLabel>
                </Stat>
                <Stat>
                  <StatNumber>{firm.truck_posts ?? 0}</StatNumber>
                  <StatLabel>Truck Posts</StatLabel>
                </Stat>
              </Stats>
            </CardBody>
          </Card>
        </Grid>
      ) : (
        <Empty>
          <EmptyTitle>No Firm linked to your account</EmptyTitle>
          <EmptyText>
            We couldn’t find a Firm record for your administrator email
            {userEmail ? ` (${userEmail})` : ''}. You can create a new Firm now,
            or update your email from the Personal tab and refresh.
          </EmptyText>
          <EmptyActions>
            <Secondary type="button" onClick={refresh} disabled={loading || refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Secondary>
            <Primary type="button" onClick={createFirm} disabled={creating || loading}>
              {creating ? 'Creating…' : 'Create Firm'}
            </Primary>
          </EmptyActions>
        </Empty>
      )}
    </Container>
  );
};

export default Work;

// styled-components below component (per project rules)
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 2vw, 16px);
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Title = styled.h3`
  margin: 0;
  color: #2a2f45;
  font-size: clamp(16px, 2.2vw, 18px);
`;

const Actions = styled.div`
  display: inline-flex;
  gap: 10px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Card = styled.section<{ $span2?: boolean }>`
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.08);
  border-radius: 12px;
  padding: clamp(12px, 2vw, 16px);
  grid-column: ${(p) => (p.$span2 ? '1 / -1' : 'auto')};
`;

const CardHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const CardTitle = styled.h4`
  margin: 0;
  color: #2a2f45;
  font-weight: 700;
  font-size: clamp(14px, 2vw, 16px);
`;

const CardBody = styled.div`
  display: block;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px dashed rgba(40, 44, 69, 0.08);

  &:first-child {
    border-top: none;
  }
`;

const FieldLabel = styled.div`
  color: #475569;
  font-size: 13px;
`;

const FieldValue = styled.div`
  color: #2a2f45;
`;

const Small = styled.small`
  color: #64748b;
`;

const Em = styled.em`
  color: #64748b;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
`;

const Stat = styled.div`
  background: #f8fafc;
  border: 1px solid rgba(40,44,69,0.06);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
`;

const StatNumber = styled.div`
  font-weight: 800;
  font-size: clamp(18px, 3vw, 22px);
  color: #0d6efd;
`;

const StatLabel = styled.div`
  color: #64748b;
  font-size: 12px;
`;

const Empty = styled.section`
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.08);
  border-radius: 12px;
  padding: clamp(16px, 3vw, 20px);
`;

const EmptyTitle = styled.h4`
  margin: 0 0 6px 0;
  color: #2a2f45;
  font-weight: 700;
  font-size: clamp(14px, 2vw, 16px);
`;

const EmptyText = styled.p`
  margin: 0 0 12px 0;
  color: #6c757d;
  font-size: clamp(12px, 1.8vw, 14px);
`;

const EmptyActions = styled.div`
  display: inline-flex;
  gap: 10px;
`;

const Muted = styled.div`
  color: #64748b;
  font-size: 14px;
`;

const Button = styled.button`
  appearance: none;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
`;

const Primary = styled(Button)`
  background: #0d6efd;
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(13, 110, 253, 0.28);

  &:hover {
    background: #0b5ed7;
  }
  &:active {
    background: #0a58ca;
  }
  &:focus-visible {
    outline: 2px solid #0d6efd;
    outline-offset: 2px;
  }

  &:disabled,
  &[aria-disabled='true'] {
    background: #93c5fd;
    box-shadow: none;
    cursor: not-allowed;
  }
`;

const Secondary = styled(Button)`
  background: transparent;
  color: #2a2f45;
  border-color: rgba(42, 47, 69, 0.3);

  &:hover {
    background: rgba(42, 47, 69, 0.06);
  }
  &:active {
    background: rgba(42, 47, 69, 0.12);
  }
  &:focus-visible {
    outline: 2px solid #2a2f45;
    outline-offset: 2px;
  }
`;
