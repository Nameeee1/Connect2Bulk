import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { useAlert } from '../../../components/AlertProvider';

// Country list restricted per request: American, Philippines, Indian, England, Australian
const COUNTRY_OPTIONS = [
  { iso2: 'US', name: 'United States', dial: '+1' },
  { iso2: 'PH', name: 'Philippines', dial: '+63' },
  { iso2: 'IN', name: 'India', dial: '+91' },
  { iso2: 'GB', name: 'England', dial: '+44' },
  { iso2: 'AU', name: 'Australia', dial: '+61' },
];

const Personal: React.FC = () => {
  const client = useMemo(() => generateClient<Schema>(), []);
  const alertApi = useAlert();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    city: '',
    country: '',
    timezone: '',
    language: 'en',
    bio: '',
    newsletter: false,
    twoFactor: false,
    avatarUrl: '',
    countryIso2: 'US',
    countryCode: '+1',
  });

  const [editing, setEditing] = useState(false);
  const snapshotRef = useRef<typeof form>(form);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof typeof form, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [avatarError, setAvatarError] = useState<string>('');

  const [saving, setSaving] = useState(false);

  // Load current Cognito user attributes to prefill profile
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const attrs = await fetchUserAttributes();
        if (!mounted) return;
        const first = attrs.given_name || '';
        const last = attrs.family_name || '';
        const email = attrs.email || '';
        const phone = attrs.phone_number || '';
        // Derive country code and iso2 from phone if possible
        let countryCode = ' +1'.trim();
        let countryIso2 = 'US';
        if (phone.startsWith('+')) {
          const match = COUNTRY_OPTIONS.find((o) => phone.startsWith(o.dial));
          if (match) {
            countryCode = match.dial;
            countryIso2 = match.iso2;
          }
        }
        const displayPhone = phone
          ? (phone.startsWith(countryCode)
              ? `${countryCode} ${phone.slice(countryCode.length).trim()}`
              : phone)
          : '';
        setForm((prev) => {
          const next = {
            ...prev,
            firstName: first,
            lastName: last,
            email,
            phone: displayPhone,
            countryCode,
            countryIso2,
          };
          snapshotRef.current = next;
          return next;
        });
      } catch (e) {
        // ignore; user may be unauthenticated briefly
        // console.error('Failed to load user attributes', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = e.currentTarget as HTMLInputElement;
      const value = target.type === 'checkbox' ? target.checked : target.value;
      setForm((prev) => ({ ...prev, [key]: value as any }));
      if (touched[key]) {
        const msg = validateField(key, value as any);
        setErrors((prev) => ({ ...prev, [key]: msg }));
      }
    };

  const flagEmoji = (iso2: string) =>
    iso2
      .toUpperCase()
      .replace(/[A-Z]/g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

  const onCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const iso = e.target.value;
    const opt = COUNTRY_OPTIONS.find((o) => o.iso2 === iso);
    if (opt) {
      setForm((prev) => ({ ...prev, countryIso2: iso, countryCode: opt.dial }));
    }
  };

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const onPhoneChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const raw = (e.currentTarget as HTMLInputElement).value || '';
    const dial = form.countryCode || '';
    if (!dial) {
      set('phone')(e as any);
      return;
    }
    const stripped = raw
      .replace(/^\+\d{1,4}\s*/, '') // remove any leading +NNN
      .replace(new RegExp('^' + escapeRegExp(dial) + '\\s*'), ''); // remove selected dial if present
    const next = `${dial} ${stripped}`.replace(/\s+/g, ' ').trimEnd();
    setForm((prev) => ({ ...prev, phone: next }));
    if (touched.phone) {
      const msg = validateField('phone', next);
      setErrors((prev) => ({ ...prev, phone: msg }));
    }
  };

  const onPhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const dial = form.countryCode || '';
    if (!dial) return;
    const input = e.currentTarget as HTMLInputElement;
    const pos = input.selectionStart ?? 0;
    const blockBackspace = e.key === 'Backspace' && pos <= dial.length;
    const blockDelete = e.key === 'Delete' && pos < dial.length + 1;
    if (blockBackspace || blockDelete) {
      e.preventDefault();
    }
  };

  // When the selected country code changes, prefix or replace the phone's dialing code.
  useEffect(() => {
    // Only adjust while editing to avoid surprising changes in read-only mode
    if (!editing) return;
    const phone = (form.phone || '').trim();
    const dial = form.countryCode || '';
    if (!dial) return;

    if (!phone) {
      setForm((prev) => ({ ...prev, phone: `${dial} ` }));
      return;
    }

    const leadingCode = /^\+\d{1,4}/; // matches a leading +NNN.. dialing code
    if (leadingCode.test(phone)) {
      const rest = phone.replace(leadingCode, '').trimStart();
      const next = `${dial} ${rest}`.trimEnd();
      if (next !== phone) setForm((prev) => ({ ...prev, phone: next }));
    } else if (!phone.startsWith(dial)) {
      setForm((prev) => ({ ...prev, phone: `${dial} ${phone}` }));
    }
  }, [form.countryCode, editing]);

  // When entering edit mode and phone is empty, prefill with current country code
  useEffect(() => {
    if (editing && !(form.phone || '').trim() && form.countryCode) {
      setForm((prev) => ({ ...prev, phone: `${prev.countryCode} ` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const validateField = (key: keyof typeof form, value: any): string => {
    switch (key) {
      case 'firstName':
        return value?.trim() ? '' : 'First name is required.';
      case 'lastName':
        return value?.trim() ? '' : 'Last name is required.';
      case 'email': {
        if (!value?.trim()) return 'Email is required.';
        const re = /[^@\s]+@[^@\s]+\.[^@\s]+/;
        return re.test(value) ? '' : 'Enter a valid email address.';
      }
      case 'phone': {
        if (!value) return '';
        const v = String(value).trim();
        if (form.countryCode && !v.startsWith(form.countryCode)) {
          return `Phone must start with ${form.countryCode}`;
        }
        const re = /^[+()\-\d\s]{6,}$/;
        return re.test(v) ? '' : 'Phone can contain digits, spaces, +, -, ( ).';
      }
      case 'dateOfBirth': {
        if (!value) return '';
        try {
          const d = new Date(value);
          const today = new Date();
          if (d > today) return 'Date of birth cannot be in the future.';
        } catch {}
        return '';
      }
      default:
        return '';
    }
  };

  const handleBlur = (key: keyof typeof form) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const msg = validateField(key, (form as any)[key]);
    setErrors((prev) => ({ ...prev, [key]: msg }));
  };

  const validateAll = () => {
    const next: Partial<Record<keyof typeof form, string>> = {};
    (['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'] as Array<keyof typeof form>).forEach((k) => {
      next[k] = validateField(k, (form as any)[k]);
    });
    setErrors(next);
    return next;
  };

  // Convert mixed-format input to E.164 (+<digits>) using current country code when needed
  const sanitizeE164 = (input: string): string | null => {
    if (!input) return null;
    const only = input.replace(/[^0-9+]/g, '');
    const digits = only.replace(/[^0-9]/g, '');
    if (!digits) return null;
    if (only.startsWith('+')) {
      return `+${digits}`;
    }
    const ccDigits = (form.countryCode || '').replace(/[^0-9]/g, '');
    const withCC = ccDigits ? `${ccDigits}${digits}` : digits;
    return `+${withCC}`;
  };

  const onFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please upload an image file (PNG or JPG).');
      return;
    }
    setAvatarError('');
    const url = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, avatarUrl: url }));
  };

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  const onAvatarDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onAvatarDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  };
  const onAvatarDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const onAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = validateAll();
    const hasErrors = Object.values(errs).some(Boolean);
    if (hasErrors) return;
    (async () => {
      setSaving(true);
      try {
        const updates: Record<string, string> = {
          given_name: form.firstName?.trim() || '',
          family_name: form.lastName?.trim() || '',
        };
        // Email: if provided, set; Cognito may send a verification to new email
        if (form.email?.trim()) updates.email = form.email.trim();
        // Phone: sanitize to E.164 (e.g., +1234567890)
        const raw = (form.phone || '').trim();
        if (raw) {
          const e164 = sanitizeE164(raw);
          if (e164) updates.phone_number = e164;
        }
        await updateUserAttributes({ userAttributes: updates });

        // Also persist overlapping fields to Amplify Data (Firm)
        try {
          const emailBefore = (snapshotRef.current?.email || '').trim();
          const targetEmailRaw = emailBefore || (form.email?.trim() || '');
          const targetEmail = targetEmailRaw.toLowerCase();
          if (targetEmail) {
            const { data: firms, errors } = await client.models.Firm.list({
              filter: { administrator_email: { eq: targetEmail } },
              limit: 1,
            });
            if (!errors?.length && firms && firms.length > 0) {
              const firm = firms[0];
              await client.models.Firm.update({
                id: firm.id,
                administrator_email: (form.email?.trim() || firm.administrator_email)?.toLowerCase(),
                administrator_first_name: form.firstName?.trim() || firm.administrator_first_name,
                administrator_last_name: form.lastName?.trim() || firm.administrator_last_name,
              });
              // Persist Firm ID for Work tab to fetch by ID (strong consistency)
              try { localStorage.setItem('c2b:myFirmId', String(firm.id)); } catch {}
            } else {
              const id = `firm-not-found-${Date.now()}`;
              const handleCreate = async () => {
                try {
                  setSaving(true);
                  await client.models.Firm.create({
                    firm_name: '',
                    address: '',
                    city: '',
                    country: 'USA',
                    administrator_email: (form.email?.trim() || targetEmail)?.toLowerCase(),
                    administrator_first_name: form.firstName?.trim() || '',
                    administrator_last_name: form.lastName?.trim() || '',
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
                  // Attempt to look up the created Firm and persist its ID
                  try {
                    const lookup = await client.models.Firm.list({
                      filter: { administrator_email: { eq: (form.email?.trim() || targetEmail).toLowerCase() } },
                      limit: 1,
                    });
                    const f = !lookup.errors?.length && lookup.data?.[0];
                    if (f) localStorage.setItem('c2b:myFirmId', String(f.id));
                  } catch {}
                } catch (createErr) {
                  console.error('Failed to create Firm:', createErr);
                  alertApi.error({
                    title: 'Failed to create Firm',
                    message: (createErr as any)?.message ?? 'An unexpected error occurred.',
                  });
                } finally {
                  setSaving(false);
                  alertApi.close(id);
                }
              };
              alertApi.info({
                id,
                title: 'Firm not found',
                message:
                  'We could not find a Firm record for your administrator email, so only your Auth profile was updated.',
                action: (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Secondary type="button" onClick={() => alertApi.close(id)}>
                      Dismiss
                    </Secondary>
                    <Primary type="button" onClick={handleCreate}>
                      Create Firm
                    </Primary>
                  </div>
                ),
              });
            }
          }
        } catch (firmErr) {
          console.warn('Firm update skipped/failed:', firmErr);
        }

        alertApi.success({
          title: 'Profile saved',
          message: 'If you changed your email, please verify it via the link we sent.',
        });
        setEditing(false);
      } catch (err) {
        console.error('Failed to update profile attributes:', err);
        alertApi.error({
          title: 'Failed to save profile',
          message: (err as any)?.message ?? 'An unexpected error occurred.',
        });
      } finally {
        setSaving(false);
      }
    })();
  };

  const beginEdit = () => {
    // Snapshot current form as the baseline for dirty check and cancel
    snapshotRef.current = form;
    // Reset validation states
    setSubmitAttempted(false);
    setTouched({});
    setErrors({});
    // Enter edit mode
    setEditing(true);
  };

  const onCancel = () => {
    const isDirty = JSON.stringify(form) !== JSON.stringify(snapshotRef.current);
    if (isDirty) {
      const ok = window.confirm('Discard your changes?');
      if (!ok) return;
    }
    setForm(snapshotRef.current);
    setEditing(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isDirty = editing && JSON.stringify(form) !== JSON.stringify(snapshotRef.current);
  const hasBlockingErrors = Boolean(
    validateField('firstName', form.firstName) ||
      validateField('lastName', form.lastName) ||
      validateField('email', form.email)
  );
  const canSave = isDirty && !hasBlockingErrors;

  return (
    <Form onSubmit={onSubmit} noValidate>
      <Section>
        <HeaderRow>
          <SectionTitle>Profile</SectionTitle>
          {!editing && (
            <TopActions>
              <Accent type="button" onClick={beginEdit}>Edit Profile</Accent>
            </TopActions>
          )}
        </HeaderRow>

        <AvatarRow>
          <AvatarPreview
            $src={form.avatarUrl}
            $editable={editing}
            $dragActive={dragActive}
            onDragEnter={editing ? onAvatarDragEnter : undefined}
            onDragOver={editing ? onAvatarDragOver : undefined}
            onDragLeave={editing ? onAvatarDragLeave : undefined}
            onDrop={editing ? onAvatarDrop : undefined}
            aria-label={editing ? 'Drop an image here to upload avatar' : undefined}
          />
          {editing && (
            <div>
              <Label htmlFor="avatar">Avatar</Label>
              <Input id="avatar" type="file" accept="image/*" onChange={onAvatarChange} />
              <HelpText>PNG or JPG. Drag & drop supported.</HelpText>
              {avatarError && <ErrorText role="alert">{avatarError}</ErrorText>}
            </div>
          )}
          {!editing && (
            <ProfileMeta>
              <NameLine>{[form.firstName, form.lastName].filter(Boolean).join(' ') || '—'}</NameLine>
              <SmallHint>{form.email || '—'}</SmallHint>
            </ProfileMeta>
          )}
        </AvatarRow>

        <Cards>
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardBody>
              <CardGrid>
                <Field>
                  <Label htmlFor="firstName">First name <Required>*</Required></Label>
                  {editing ? (
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={set('firstName')}
                      onBlur={() => handleBlur('firstName')}
                      aria-invalid={Boolean(errors.firstName) && (touched.firstName || submitAttempted)}
                      aria-describedby={errors.firstName && (touched.firstName || submitAttempted) ? 'firstName_error' : undefined}
                      autoComplete="given-name"
                      required
                    />
                  ) : (
                    <ValueText>{form.firstName || '—'}</ValueText>
                  )}
                  {editing && errors.firstName && (touched.firstName || submitAttempted) && (
                    <ErrorText id="firstName_error">{errors.firstName}</ErrorText>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="lastName">Last name <Required>*</Required></Label>
                  {editing ? (
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={set('lastName')}
                      onBlur={() => handleBlur('lastName')}
                      aria-invalid={Boolean(errors.lastName) && (touched.lastName || submitAttempted)}
                      aria-describedby={errors.lastName && (touched.lastName || submitAttempted) ? 'lastName_error' : undefined}
                      autoComplete="family-name"
                      required
                    />
                  ) : (
                    <ValueText>{form.lastName || '—'}</ValueText>
                  )}
                  {editing && errors.lastName && (touched.lastName || submitAttempted) && (
                    <ErrorText id="lastName_error">{errors.lastName}</ErrorText>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="dateOfBirth">Date of birth</Label>
                  {editing ? (
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={set('dateOfBirth')}
                      onBlur={() => handleBlur('dateOfBirth')}
                      aria-invalid={Boolean(errors.dateOfBirth) && (touched.dateOfBirth || submitAttempted)}
                      aria-describedby={errors.dateOfBirth && (touched.dateOfBirth || submitAttempted) ? 'dateOfBirth_error' : undefined}
                      autoComplete="bday"
                      max={todayStr}
                    />
                  ) : (
                    <ValueText>{form.dateOfBirth || '—'}</ValueText>
                  )}
                  {editing && errors.dateOfBirth && (touched.dateOfBirth || submitAttempted) && (
                    <ErrorText id="dateOfBirth_error">{errors.dateOfBirth}</ErrorText>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="gender">Gender</Label>
                  {editing ? (
                    <Select id="gender" value={form.gender} onChange={set('gender') as any}>
                      <option value="">—</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="nonbinary">Non-binary</option>
                      <option value="prefer_not">Prefer not to say</option>
                    </Select>
                  ) : (
                    <ValueText>
                      {form.gender === '' ? '—' : form.gender}
                    </ValueText>
                  )}
                </Field>
              </CardGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardBody>
              <CardGrid>
                <Field>
                  <Label htmlFor="countryIso2">Country code</Label>
                  {editing ? (
                    <DialSelect id="countryIso2" value={form.countryIso2} onChange={onCountryChange}>
                      {COUNTRY_OPTIONS.map((o) => (
                        <option key={o.iso2} value={o.iso2}>
                          {`${flagEmoji(o.iso2)} ${o.dial}`}
                        </option>
                      ))}
                    </DialSelect>
                  ) : (
                    <ValueText>
                      {(() => {
                        const o = COUNTRY_OPTIONS.find((c) => c.iso2 === form.countryIso2);
                        return o ? `${flagEmoji(o.iso2)} ${o.dial}` : '—';
                      })()}
                    </ValueText>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="phone">Phone</Label>
                  {editing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={onPhoneChange}
                      onKeyDown={onPhoneKeyDown}
                      onBlur={() => handleBlur('phone')}
                      aria-invalid={Boolean(errors.phone) && (touched.phone || submitAttempted)}
                      aria-describedby={errors.phone && (touched.phone || submitAttempted) ? 'phone_error' : 'phone_help'}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={`${form.countryCode} 123 456 7890`}
                    />
                  ) : (
                    <ValueText>{form.phone || '—'}</ValueText>
                  )}
                  {editing && <HelpText id="phone_help">Your number must start with the selected country code above.</HelpText>}
                  {editing && errors.phone && (touched.phone || submitAttempted) && (
                    <ErrorText id="phone_error">{errors.phone}</ErrorText>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="email">Email <Required>*</Required></Label>
                  {editing ? (
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      onBlur={() => handleBlur('email')}
                      aria-invalid={Boolean(errors.email) && (touched.email || submitAttempted)}
                      aria-describedby={errors.email && (touched.email || submitAttempted) ? 'email_error' : 'email_help'}
                      inputMode="email"
                      autoComplete="email"
                      required
                    />
                  ) : (
                    <ValueText>{form.email || '—'}</ValueText>
                  )}
                  {editing && errors.email && (touched.email || submitAttempted) && (
                    <ErrorText id="email_error">{errors.email}</ErrorText>
                  )}
                  {editing && <HelpText id="email_help">We’ll send notifications here.</HelpText>}
                </Field>
                <Field>
                  <Label htmlFor="country">Country</Label>
                  {editing ? (
                    <Input id="country" value={form.country} onChange={set('country')} autoComplete="country-name" />
                  ) : (
                    <ValueText>{form.country || '—'}</ValueText>
                  )}
                </Field>
              </CardGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardBody>
              <CardGrid>
                <Field>
                  <Label htmlFor="language">Language</Label>
                  {editing ? (
                    <Select id="language" value={form.language} onChange={set('language') as any}>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </Select>
                  ) : (
                    <ValueText>
                      {form.language === 'en' ? 'English' : form.language === 'es' ? 'Spanish' : form.language === 'fr' ? 'French' : '—'}
                    </ValueText>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="timezone">Time zone</Label>
                  {editing ? (
                    <Input id="timezone" value={form.timezone} onChange={set('timezone')} placeholder="e.g., America/Chicago" aria-describedby="tz_help" />
                  ) : (
                    <ValueText>{form.timezone || '—'}</ValueText>
                  )}
                  {editing && <HelpText id="tz_help">Use an IANA zone like America/Chicago.</HelpText>}
                </Field>
              </CardGrid>
            </CardBody>
          </Card>

          <Card $span2>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardBody>
              <Field $span2>
                <Label htmlFor="bio">Bio</Label>
                {editing ? (
                  <>
                    <TextArea id="bio" rows={4} value={form.bio} onChange={set('bio') as any} placeholder="A short bio..." maxLength={280} />
                    <MetaRow>
                      <HelpText>Brief introduction; max 280 characters.</HelpText>
                      <CharCounter>{form.bio.length}/280</CharCounter>
                    </MetaRow>
                  </>
                ) : (
                  <ValueText as="div" style={{ minHeight: '72px', alignItems: 'flex-start' }}>{form.bio || '—'}</ValueText>
                )}
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security & Notifications</CardTitle>
            </CardHeader>
            <CardBody>
              {editing ? (
                <>
                  <CheckboxField>
                    <input id="newsletter" type="checkbox" checked={form.newsletter} onChange={set('newsletter') as any} />
                    <span>Subscribe to newsletter</span>
                  </CheckboxField>
                  <CheckboxField>
                    <input id="twoFactor" type="checkbox" checked={form.twoFactor} onChange={set('twoFactor') as any} />
                    <span>Enable two-factor authentication</span>
                  </CheckboxField>
                </>
              ) : (
                <>
                  <ValueText>{form.newsletter ? 'Subscribed to newsletter' : 'Not subscribed to newsletter'}</ValueText>
                  <ValueText>{form.twoFactor ? 'Two-factor authentication: On' : 'Two-factor authentication: Off'}</ValueText>
                </>
              )}
            </CardBody>
          </Card>
        </Cards>
      </Section>

      {editing && (
        <Actions>
          <Secondary type="button" onClick={onCancel}>
            Cancel
          </Secondary>
          <Primary type="submit" disabled={!canSave || saving} aria-disabled={!canSave || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Primary>
        </Actions>
      )}
    </Form>
  );
};

export default Personal;

/* styled-components (below component per project rules) */
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2.2vw, 24px);
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  color: #2a2f45;
  font-size: clamp(16px, 2.2vw, 18px);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const TopActions = styled.div`
  display: flex;
  gap: 10px;
  margin-left: auto;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(12px, 2vw, 16px);

  @media (min-width: 900px) {
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

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const ProfileMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
`;

const NameLine = styled.div`
  font-weight: 700;
  color: #2a2f45;
  font-size: clamp(16px, 2.2vw, 18px);
`;

 

const Field = styled.label<{ $span2?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: ${(p) => (p.$span2 ? '1 / -1' : 'auto')};
`;

const Label = styled.label`
  font-size: 13px;
  color: #475569;
`;

const Required = styled.span`
  color: #dc3545;
  font-weight: 700;
  margin-left: 2px;
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

  &::placeholder {
    color: #94a3b8;
  }

  &[aria-invalid='true'] {
    border-color: #dc3545;
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.12);
  }

  &:disabled,
  &[aria-disabled='true'] {
    background: #f1f5f9;
    color: #64748b;
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
`;

// Compact select specifically for dialing code: only as wide as its content
const DialSelect = styled(Select)`
  width: auto;
  min-width: 88px;
  max-width: 132px;
  align-self: start;
  padding-right: 28px; /* keep room for the dropdown arrow */
`;

const ValueText = styled.div`
  ${sharedInput}
  background: #f8fafc;
  color: #2a2f45;
  display: flex;
  align-items: center;
  min-height: 40px;
  /* Prevent long, unbroken content (e.g., emails/URLs) from pushing layout wide */
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
`;

const HelpText = styled.small`
  display: block;
  margin-top: 6px;
  color: #6c757d;
`;

const ErrorText = styled.small`
  display: block;
  margin-top: 6px;
  color: #dc3545;
  font-weight: 600;
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

const AvatarRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const AvatarPreview = styled.div<{ $src?: string; $editable?: boolean; $dragActive?: boolean }>`
  width: clamp(56px, 6vw, 72px);
  height: clamp(56px, 6vw, 72px);
  border-radius: 50%;
  border: ${({ $editable }) => ($editable ? '2px dashed rgba(40, 44, 69, 0.2)' : '1px solid rgba(40, 44, 69, 0.12)')};
  background: ${({ $src }) => ($src ? `url(${$src}) center/cover no-repeat` : '#e2e8f0')};
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
  cursor: ${({ $editable }) => ($editable ? 'copy' : 'default')};

  ${({ $dragActive }) =>
    $dragActive
      ? `
    border-color: #0d6efd;
    box-shadow: 0 0 0 3px rgba(13,110,253,0.15);
  `
      : ''}
`;

const SmallHint = styled.small`
  display: block;
  margin-top: 6px;
  color: #6c757d;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
`;

const CharCounter = styled.small`
  color: #64748b;
`;

const Actions = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 12px 0 4px;
  background: linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 24%);
  border-top: 1px solid rgba(40, 44, 69, 0.08);
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

const Accent = styled(Button)`
  background: #dc3545; /* red */
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(220, 53, 69, 0.25);

  &:hover {
    background: #bb2d3b;
  }
  &:active {
    background: #a52834;
  }
  &:focus-visible {
    outline: 2px solid #dc3545;
    outline-offset: 2px;
  }
`;