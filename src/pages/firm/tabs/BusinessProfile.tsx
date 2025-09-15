import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
 import { FIRM_TYPES } from '../constants';

type FirmEntity = {
  id?: string;
  firm_name?: string;
  address?: string;
  city?: string;
  country?: string;
  administrator_email?: string;
  administrator_first_name?: string;
  administrator_last_name?: string;
  state?: string;
  zip?: string;
  firm_type?: string;
  dba?: string;
  dot?: string;
  mc?: string;
  ein?: string;
  phone?: string;
  website?: string;
  insurance_provider?: string;
  policy_number?: string;
  policy_expiry?: string;
  w9_on_file?: boolean;
  brand_color?: string;
  notes?: string;
  load_posts?: number;
  truck_posts?: number;
  createdAt?: string;
  updatedAt?: string;
};

const BusinessProfile: React.FC = () => {
  const client = useMemo(() => generateClient<Schema>(), []);
  const tryList = async (params: any) => {
    try {
      return await client.models.Firm.list({ ...params, authMode: 'userPool' } as any);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/Not Authorized/i.test(msg) || /Unauthorized/i.test(msg) || /Missing credentials/i.test(msg)) {
        return await client.models.Firm.list({ ...params, authMode: 'identityPool' } as any);
      }
      throw e;
    }
  };
  const tryUpdate = async (payload: any) => {
    try {
      return await client.models.Firm.update(payload, { authMode: 'userPool' } as any);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/Not Authorized/i.test(msg) || /Unauthorized/i.test(msg) || /Missing credentials/i.test(msg)) {
        return await client.models.Firm.update(payload, { authMode: 'identityPool' } as any);
      }
      throw e;
    }
  };
  const tryCreate = async (payload: any) => {
    try {
      return await client.models.Firm.create(payload, { authMode: 'userPool' } as any);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/Not Authorized/i.test(msg) || /Unauthorized/i.test(msg) || /Missing credentials/i.test(msg)) {
        return await client.models.Firm.create(payload, { authMode: 'identityPool' } as any);
      }
      throw e;
    }
  };

  const resolveFirmIdFromUser = async (email: string): Promise<string | undefined> => {
    if (!email) return undefined;
    // Attempt to list Users and find the current user by email to read firm_id
    try {
      try {
        const { data, errors } = await client.models.User.list({ authMode: 'userPool' } as any);
        if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
        const me = (data as any[]).find((u: any) => String(u?.email || '').trim().toLowerCase() === email);
        return me?.firm_id ? String(me.firm_id) : undefined;
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        const isAuth = /Not Authorized|Unauthorized|Missing credentials/i.test(msg);
        const isEnumSerialize = /serialize value|Invalid input for Enum/i.test(msg);
        if (isAuth) {
          const { data, errors } = await client.models.User.list({ authMode: 'identityPool' } as any);
          if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
          const me = (data as any[]).find((u: any) => String(u?.email || '').trim().toLowerCase() === email);
          return me?.firm_id ? String(me.firm_id) : undefined;
        }
        if (isEnumSerialize) {
          const { data } = await (client.models.User.list as any)({ selectionSet: ['id','email','firm_id'], authMode: 'userPool' });
          const me = (data as any[]).find((u: any) => String(u?.email || '').trim().toLowerCase() === email);
          return me?.firm_id ? String(me.firm_id) : undefined;
        }
        throw err;
      }
    } catch {
      return undefined;
    }
  };

  const [loading, setLoading] = useState(true);
  const [firm, setFirm] = useState<FirmEntity | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userFirst, setUserFirst] = useState('');
  const [userLast, setUserLast] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');

  const [form, setForm] = useState({
    legalName: '',
    dba: '',
    dot: '',
    mc: '',
    ein: '',
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    insuranceProvider: '',
    policyNumber: '',
    policyExpiry: '',
    w9OnFile: false,
    brandColor: '#0d6efd',
    firmType: '',
    notes: '',
  });

  const firmIdKey = 'c2b:myFirmId';
  const readFirmId = (): string | null => {
    try { return localStorage.getItem(firmIdKey); } catch { return null; }
  };

  const refreshFirmById = async (id: string) => {
    const res = await tryList({ filter: { id: { eq: id } }, limit: 1 });
    if (!res.errors?.length && res.data?.[0]) {
      setFirm(res.data[0] as FirmEntity);
      try { localStorage.setItem(firmIdKey, String((res.data[0] as any).id)); } catch {}
    }
  };

  const fetchFirmByEmail = async (
    normalizedEmail: string,
    rawEmail?: string,
    retries = 2
  ): Promise<FirmEntity | null> => {
    for (let i = 0; i < retries; i += 1) {
      const { data, errors } = await tryList({
        filter: { administrator_email: { eq: normalizedEmail } },
        limit: 1,
      });
      if (!errors?.length && data?.[0]) return data[0] as FirmEntity;
      if (rawEmail && rawEmail !== normalizedEmail) {
        const r = await tryList({
          filter: { administrator_email: { eq: rawEmail } },
          limit: 1,
        });
        if (!r.errors?.length && r.data?.[0]) return r.data[0] as FirmEntity;
      }
      await new Promise((r) => setTimeout(r, 300));
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

      // Try persisted ID first
      const persistedId = readFirmId();
      let chosen: FirmEntity | null = null;
      if (persistedId) {
        const byId = await tryList({ filter: { id: { eq: persistedId } }, limit: 1 });
        if (!byId.errors?.length && byId.data?.[0]) {
          const candidate = byId.data[0] as FirmEntity;
          const adminEmail = (candidate as any)?.administrator_email?.toLowerCase?.() || '';
          if (!email || adminEmail === email) {
            chosen = candidate;
          }
        }
      }

      // If we still don't have a firm, try resolving via the User.firm_id link
      if (!chosen) {
        const linkedFirmId = await resolveFirmIdFromUser(email);
        if (linkedFirmId) {
          const byLinked = await tryList({ filter: { id: { eq: linkedFirmId } }, limit: 1 });
          if (!byLinked.errors?.length && byLinked.data?.[0]) {
            chosen = byLinked.data[0] as FirmEntity;
            try { localStorage.setItem(firmIdKey, String((byLinked.data[0] as any).id)); } catch {}
          }
        }
      }

      // If still not set, try by email
      if (!chosen) {
        const found = await fetchFirmByEmail(email, emailRaw, 3);
        if (found) chosen = found;
      }

      if (chosen) setFirm(chosen);

      // Prefill form with whatever Firm we have plus user defaults
      setForm((prev) => ({
        ...prev,
        legalName: (chosen || firm)?.firm_name || prev.legalName,
        dba: (chosen || firm as any)?.dba || prev.dba,
        dot: (chosen || firm as any)?.dot || prev.dot,
        mc: (chosen || firm as any)?.mc || prev.mc,
        ein: (chosen || firm as any)?.ein || prev.ein,
        phone: (chosen || firm as any)?.phone || prev.phone,
        street: (chosen || firm)?.address || prev.street,
        city: (chosen || firm as any)?.city || prev.city,
        state: (chosen || firm)?.state || prev.state,
        zip: (chosen || firm)?.zip || prev.zip,
        country: (chosen || firm as any)?.country || prev.country,
        website: (chosen || firm as any)?.website || prev.website,
        insuranceProvider: (chosen || firm as any)?.insurance_provider || prev.insuranceProvider,
        policyNumber: (chosen || firm as any)?.policy_number || prev.policyNumber,
        policyExpiry: (chosen || firm as any)?.policy_expiry || prev.policyExpiry,
        w9OnFile: Boolean((chosen || firm as any)?.w9_on_file ?? prev.w9OnFile),
        brandColor: (chosen || firm as any)?.brand_color || prev.brandColor,
        firmType: (chosen || firm as any)?.firm_type || prev.firmType,
        notes: (chosen || firm as any)?.notes || prev.notes,
        email: prev.email || emailRaw,
      }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load BusinessProfile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fire and forget
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-clear success notice after a short delay
  useEffect(() => {
    if (saveStatus === 'success') {
      const t = setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.currentTarget;
    let value: any;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      value = target.checked;
    } else {
      value = (target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // EIN normalization: keep only digits (max 9). We'll format for display separately.
  const onEinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.currentTarget.value.replace(/\D/g, '').slice(0, 9);
    setForm((prev) => ({ ...prev, ein: digits }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      try {
        setSaveStatus('saving');
        setSaveMessage('');
        setLoading(true);
        const normalizedEmail = (form.email || userEmail || '').trim().toLowerCase();
        if (firm?.id) {
          // Update existing Firm with mapped fields
          const res = await tryUpdate({
            id: firm.id,
            firm_name: form.legalName,
            dba: form.dba,
            dot: form.dot,
            mc: form.mc,
            ein: form.ein,
            phone: form.phone,
            address: form.street,
            city: form.city,
            state: form.state,
            zip: form.zip,
            country: form.country,
            website: form.website,
            insurance_provider: form.insuranceProvider,
            policy_number: form.policyNumber,
            policy_expiry: form.policyExpiry,
            w9_on_file: !!form.w9OnFile,
            brand_color: form.brandColor || '#0d6efd',
            notes: form.notes,
            firm_type: (form.firmType as any) || (firm.firm_type as any) || 'Other',
            administrator_email: normalizedEmail || (firm.administrator_email as any),
          });
          if (!res.errors?.length && res.data) {
            setFirm(res.data as FirmEntity);
            try { localStorage.setItem(firmIdKey, String((res.data as any).id)); } catch {}
            setSaveStatus('success');
            setSaveMessage('Changes saved');
            setLastSavedAt(new Date().toLocaleString());
            try { await refreshFirmById(String((res.data as any).id)); } catch {}
          } else {
            setSaveStatus('error');
            setSaveMessage(res.errors?.map((e) => e.message).join('; ') || 'Save failed');
          }
        } else {
          // Create minimal Firm if missing
          const attrs = await fetchUserAttributes();
          const first = (attrs.given_name || '').trim();
          const last = (attrs.family_name || '').trim();
          const created = await tryCreate({
            firm_name: form.legalName || '',
            dba: form.dba || '',
            dot: form.dot || '',
            mc: form.mc || '',
            ein: form.ein || '',
            phone: form.phone || '',
            address: form.street || '',
            city: form.city || '',
            state: form.state || '',
            zip: form.zip || '',
            country: form.country || 'USA',
            website: form.website || '',
            insurance_provider: form.insuranceProvider || '',
            policy_number: form.policyNumber || '',
            policy_expiry: form.policyExpiry || '',
            w9_on_file: !!form.w9OnFile,
            brand_color: form.brandColor || '#0d6efd',
            notes: form.notes || '',
            administrator_email: normalizedEmail,
            administrator_first_name: first,
            administrator_last_name: last,
            firm_type: (form.firmType as any) || 'Other',
            load_posts: 0,
            truck_posts: 0,
          });
          if (!created.errors?.length && created.data) {
            setFirm(created.data as FirmEntity);
            try { localStorage.setItem(firmIdKey, String((created.data as any).id)); } catch {}
            setSaveStatus('success');
            setSaveMessage('Firm created and saved');
            setLastSavedAt(new Date().toLocaleString());
            try { await refreshFirmById(String((created.data as any).id)); } catch {}
          } else {
            setSaveStatus('error');
            setSaveMessage(created.errors?.map((e) => e.message).join('; ') || 'Create failed');
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('BusinessProfile save failed', err);
        setSaveStatus('error');
        setSaveMessage((err as any)?.message || 'Save failed');
      } finally {
        setLoading(false);
      }
    })();
  };

  const onCancel = () => {
    // reset to initial (simple cancel)
    setForm({
      legalName: '', dba: '', dot: '', mc: '', ein: '', phone: '', email: '', website: '',
      street: '', city: '', state: '', zip: '', country: 'USA',
      insuranceProvider: '', policyNumber: '', policyExpiry: '', w9OnFile: false,
      brandColor: '#0d6efd', firmType: '', notes: '',
    });
  };

  // derived display info
  const displayName = (form.legalName || (firm as any)?.firm_name || 'Your Company').trim() || 'Your Company';
  const initials = (displayName.match(/\b[A-Z]/gi)?.slice(0, 2).join('') || 'C2');
  const location = [form.city || (firm as any)?.city, form.state || (firm as any)?.state].filter(Boolean).join(', ');
  const firmType = (form.firmType || (firm as any)?.firm_type || '').toString();
  const brand = form.brandColor || (firm as any)?.brand_color || '#0d6efd';
  const einDisplay = form.ein ? (form.ein.length > 2 ? `${form.ein.slice(0, 2)}-${form.ein.slice(2)}` : form.ein) : '';
  const websiteRaw = (form.website || (firm as any)?.website || '').trim();
  const websiteHref = websiteRaw ? (websiteRaw.startsWith('http') ? websiteRaw : `https://${websiteRaw}`) : '';
  const expiryRaw = (form.policyExpiry || (firm as any)?.policy_expiry || '').trim();
  const expiryDate = expiryRaw ? new Date(expiryRaw) : null;
  const now = new Date();
  const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const expiryTone: 'ok' | 'warn' | 'bad' | undefined = expiryDate ? (daysToExpiry! < 0 ? 'bad' : daysToExpiry! <= 30 ? 'warn' : 'ok') : undefined;
  const expiryLabel = expiryDate ? `Ins exp. ${expiryDate.toLocaleDateString()}` : '';
  const w9Tone: 'ok' | 'warn' = form.w9OnFile ? 'ok' : 'warn';

  const [copied, setCopied] = useState(false);
  const firmId = (firm as any)?.id as string | undefined;

  const copyFirmId = async () => {
    if (!firmId) return;
    try {
      await navigator.clipboard.writeText(firmId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const scrollToBranding = () => {
    const el = document.getElementById('branding');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <MaxWidth>
      {loading ? (
        <HeaderCard>
          <Skeleton style={{ width: 56, height: 56, borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <Skeleton style={{ width: '40%', height: 16, marginBottom: 8 }} />
            <Skeleton style={{ width: '60%', height: 12 }} />
          </div>
        </HeaderCard>
      ) : (
        <HeaderCard>
          <Avatar aria-hidden $color={brand}>{initials}</Avatar>
          <HeaderInfo>
            <HeaderTitle>{displayName}</HeaderTitle>
            <Meta>
              <span>{userFirst} {userLast}</span>
              <span className="sep">•</span>
              <span>{userEmail || form.email}</span>
              {location ? (<>
                <span className="sep">•</span>
                <span>{location}</span>
              </>) : null}
              {firmType ? (<>
                <span className="sep">•</span>
                <Badge>{firmType}</Badge>
              </>) : null}
              {websiteHref ? (<>
                <span className="sep">•</span>
                <MetaLink href={websiteHref} target="_blank" rel="noopener noreferrer">Website</MetaLink>
              </>) : null}
              <span className="sep">•</span>
              <StatusBadge $tone={w9Tone}>{form.w9OnFile ? 'W-9 on file' : 'W-9 missing'}</StatusBadge>
              {expiryDate ? (<>
                <span className="sep">•</span>
                <StatusBadge $tone={expiryTone}>{expiryLabel}</StatusBadge>
              </>) : null}
            </Meta>
          </HeaderInfo>
          <HeaderActions>
            {firmId ? (
              <SmallButton type="button" onClick={copyFirmId} title={firmId} aria-label="Copy firm ID">
                {copied ? 'Copied!' : 'Copy Firm ID'}
              </SmallButton>
            ) : null}
            {websiteHref ? (
              <SmallButton as="a" href={websiteHref} target="_blank" rel="noopener noreferrer">Visit Website</SmallButton>
            ) : null}
            <SmallButton type="button" onClick={scrollToBranding}>Edit branding</SmallButton>
          </HeaderActions>
        </HeaderCard>
      )}

      <Form aria-busy={loading} onSubmit={onSubmit}>
        <Section>
          <SectionTitle>Company</SectionTitle>
          <Grid>
            <Field>
              <Label htmlFor="legalName">Legal Name</Label>
              <Input id="legalName" placeholder="Acme Logistics LLC" value={form.legalName} onChange={set('legalName')} required disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="dba">DBA</Label>
              <Input id="dba" placeholder="Acme Freight" value={form.dba} onChange={set('dba')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="dot">DOT #</Label>
              <Input id="dot" inputMode="numeric" placeholder="1234567" value={form.dot} onChange={set('dot')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="mc">MC #</Label>
              <Input id="mc" inputMode="numeric" placeholder="123456" value={form.mc} onChange={set('mc')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="ein">EIN / Tax ID</Label>
              <Input
                id="ein"
                inputMode="numeric"
                placeholder="12-3456789"
                maxLength={11}
                value={einDisplay}
                onChange={onEinChange}
                disabled={loading}
              />
            </Field>
            <Field>
              <Label htmlFor="firmType">Firm Type</Label>
              <Select id="firmType" value={form.firmType} onChange={set('firmType')} disabled={loading}>
                <option value="">Select type</option>
                {FIRM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </Grid>
        </Section>

        <Section>
          <SectionTitle>Contact</SectionTitle>
          <Grid>
            <Field>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" inputMode="tel" placeholder="(555) 555-1234" value={form.phone} onChange={set('phone')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@company.com" value={form.email} onChange={set('email')} disabled={loading} />
            </Field>
            <Field $span2>
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" placeholder="https://www.company.com" value={form.website} onChange={set('website')} disabled={loading} />
            </Field>
          </Grid>
        </Section>

        <Section>
          <SectionTitle>Address</SectionTitle>
          <Grid>
            <Field $span2>
              <Label htmlFor="street">Street</Label>
              <Input id="street" placeholder="123 Main St" value={form.street} onChange={set('street')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="City" value={form.city} onChange={set('city')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="State" value={form.state} onChange={set('state')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="zip">Zip</Label>
              <Input id="zip" inputMode="numeric" placeholder="12345" value={form.zip} onChange={set('zip')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="USA" value={form.country} onChange={set('country')} disabled={loading} />
            </Field>
          </Grid>
        </Section>

        <Section>
          <SectionTitle>Compliance & Insurance</SectionTitle>
          <Grid>
            <Field>
              <Label htmlFor="insuranceProvider">Provider</Label>
              <Input id="insuranceProvider" placeholder="Acme Insurance Co" value={form.insuranceProvider} onChange={set('insuranceProvider')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="policyNumber">Policy #</Label>
              <Input id="policyNumber" placeholder="POL-000000" value={form.policyNumber} onChange={set('policyNumber')} disabled={loading} />
            </Field>
            <Field>
              <Label htmlFor="policyExpiry">Expiration</Label>
              <Input id="policyExpiry" type="date" value={form.policyExpiry} onChange={set('policyExpiry')} disabled={loading} />
            </Field>
            <CheckboxField>
              <input id="w9" type="checkbox" checked={form.w9OnFile} onChange={set('w9OnFile')} disabled={loading} />
              <span>W-9 on file</span>
            </CheckboxField>
          </Grid>
        </Section>

        <Section>
          <SectionTitle id="branding">Branding & Preferences</SectionTitle>
          <Grid>
            <Field>
              <Label htmlFor="brandColor">Brand Color</Label>
              <Input id="brandColor" type="color" value={form.brandColor} onChange={set('brandColor')} disabled={loading} />
            </Field>
            <Field $span2>
              <Label htmlFor="notes">Notes</Label>
              <TextArea id="notes" rows={4} placeholder="Internal notes about partners, payment terms, etc." value={form.notes} onChange={set('notes')} disabled={loading} />
            </Field>
          </Grid>
        </Section>

        <Actions>
          <Secondary type="button" onClick={onCancel} disabled={loading}>Cancel</Secondary>
          <Primary type="submit" disabled={loading || saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving…' : 'Save'}
          </Primary>
        </Actions>
        {saveStatus !== 'idle' ? (
          <SaveNotice $status={saveStatus} role={saveStatus === 'error' ? 'alert' : 'status'}>
            {saveMessage}
            {lastSavedAt && saveStatus === 'success' ? (
              <span className="time">Last saved: {lastSavedAt}</span>
            ) : null}
          </SaveNotice>
        ) : null}
      </Form>
    </MaxWidth>
  );
};

export default BusinessProfile;

// styled-components below the component (per project rules)
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2.2vw, 24px);
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fbfbfd;
  border: 1px solid rgba(40, 44, 69, 0.06);
  border-radius: 12px;
  padding: clamp(12px, 2vw, 16px);
`;

const SectionTitle = styled.h3`
  margin: 0;
  color: #2a2f45;
  font-size: clamp(16px, 2.2vw, 18px);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;

  @media (min-width: 1200px) {
    gap: 14px;
  }
`;

const Field = styled.div<{ $span2?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: ${(p) => (p.$span2 ? '1 / -1' : 'auto')};
`;

const Label = styled.label`
  font-size: 13px;
  color: #475569;
`;

const sharedInput = `
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid rgba(40, 44, 69, 0.12);
  border-radius: 10px;
  background: #ffffff;
  color: #2a2f45;
  font: inherit;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:focus-visible {
    border-color: #0d6efd;
    box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.2);
  }

  &:disabled {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  ${sharedInput}
`;

const TextArea = styled.textarea`
  ${sharedInput}
  resize: vertical;
`;

const Select = styled.select`
  ${sharedInput}
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #64748b 50%),
    linear-gradient(135deg, #64748b 50%, transparent 50%),
    linear-gradient(to right, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.05));
  background-position: calc(100% - 16px) calc(1em + 2px), calc(100% - 11px) calc(1em + 2px), 100% 0;
  background-size: 5px 5px, 5px 5px, 2.5em 100%;
  background-repeat: no-repeat;
`;

const CheckboxField = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
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
  &:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
`;

const Primary = styled(Button)`
  background: #0d6efd;
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(13, 110, 253, 0.28);

  &:hover { background: #0b5ed7; }
  &:active { background: #0a58ca; }
  &:focus-visible { outline: 2px solid #0d6efd; outline-offset: 2px; }
`;

const Secondary = styled(Button)`
  background: transparent;
  color: #2a2f45;
  border-color: rgba(42, 47, 69, 0.3);

  &:hover { background: rgba(42, 47, 69, 0.06); }
  &:active { background: rgba(42, 47, 69, 0.12); }
  &:focus-visible { outline: 2px solid #2a2f45; outline-offset: 2px; }
`;

const MaxWidth = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2.2vw, 24px);
`;

const HeaderCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.06);
  border-radius: 12px;
  padding: clamp(12px, 2vw, 16px);
`;

const Avatar = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(44px, 5vw, 56px);
  height: clamp(44px, 5vw, 56px);
  border-radius: 12px;
  background: ${(p) => p.$color};
  color: #ffffff;
  font-weight: 800;
  font-size: clamp(16px, 2vw, 18px);
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: clamp(18px, 2.4vw, 22px);
  color: #2a2f45;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;

  .sep { opacity: 0.7; }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-weight: 600;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(13, 110, 253, 0.08);
  color: #0d6efd;
`;

const Skeleton = styled.div`
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const MetaLink = styled.a`
  color: #0d6efd;
  text-decoration: none;
  font-weight: 600;
  &:hover { text-decoration: underline; }
  &:focus-visible { outline: 2px solid #0d6efd; outline-offset: 2px; border-radius: 4px; }
`;

const toneStyles = (tone?: 'ok' | 'warn' | 'bad') => {
  switch (tone) {
    case 'ok':
      return 'background: rgba(16, 185, 129, 0.12); color: #059669;';
    case 'warn':
      return 'background: rgba(245, 158, 11, 0.15); color: #b45309;';
    case 'bad':
      return 'background: rgba(239, 68, 68, 0.15); color: #b91c1c;';
    default:
      return 'background: rgba(100, 116, 139, 0.12); color: #475569;';
  }
};

const StatusBadge = styled.span<{ $tone?: 'ok' | 'warn' | 'bad' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-weight: 600;
  font-size: 12px;
  border-radius: 999px;
  ${(p) => toneStyles(p.$tone)}
`;

const HeaderActions = styled.div`
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const SmallButton = styled(Button)`
  padding: 8px 12px;
  font-size: 12px;
  border-color: rgba(42, 47, 69, 0.2);
  background: #ffffff;
  color: #2a2f45;
  &:hover { background: rgba(42, 47, 69, 0.06); }
  &:active { background: rgba(42, 47, 69, 0.12); }
`;

const SaveNotice = styled.div<{ $status: 'idle' | 'saving' | 'success' | 'error' }>`
  margin-top: 10px;
  font-size: 13px;
  display: inline-flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  ${(p) =>
    p.$status === 'success'
      ? 'background: rgba(16, 185, 129, 0.12); color: #059669;'
      : p.$status === 'error'
      ? 'background: rgba(239, 68, 68, 0.15); color: #b91c1c;'
      : 'background: rgba(100, 116, 139, 0.08); color: #475569;'}

  .time {
    opacity: 0.8;
  }
`;