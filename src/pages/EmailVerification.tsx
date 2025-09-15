import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmSignUp, signIn, confirmSignIn, resendSignUpCode, updatePassword, updateUserAttributes, signOut } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialEmail = params.get('email') ?? '';

  const [email] = useState(initialEmail);
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [step, setStep] = useState<'verify' | 'setPassword'>('verify');
  const [submitting, setSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(30);
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');

  const tempPasswordKey = useMemo(() => `tmpPwd:${email}`, [email]);
  const pendingFirmKey = useMemo(() => `pendingFirm:${email}`, [email]);
  const client = useMemo(() => generateClient<Schema>(), []);

  useEffect(() => {
    if (step === 'verify') {
      // Focus first empty input when entering verify step
      const firstEmpty = codeDigits.findIndex((d) => !d);
      const idx = firstEmpty === -1 ? 0 : firstEmpty;
      const el = inputsRef.current[idx];
      el?.focus();
    }
  }, [step, codeDigits]);

  useEffect(() => {
    if (step !== 'verify') return;
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn, step]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const code = codeDigits.join('');
      if (code.length !== 6) {
        setError('Please enter the 6-digit code.');
        setSubmitting(false);
        return;
      }
      await confirmSignUp({ username: email, confirmationCode: code });
      setStep('setPassword');
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const focusInput = (idx: number) => {
    const el = inputsRef.current[idx];
    if (el) el.focus();
  };

  const handleDigitChange = (idx: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 1);
    setCodeDigits((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    if (v && idx < 5) focusInput(idx + 1);
  };

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[idx] && idx > 0) {
      e.preventDefault();
      focusInput(idx - 1);
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      focusInput(idx - 1);
    }
    if (e.key === 'ArrowRight' && idx < 5) {
      e.preventDefault();
      focusInput(idx + 1);
    }
  };

  const handlePaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setCodeDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < text.length && idx + i < 6; i += 1) {
        next[idx + i] = text[i];
      }
      return next;
    });
    const lastIdx = Math.min(idx + text.length - 1, 5);
    focusInput(lastIdx);
  };

  const handleResend = async () => {
    try {
      await resendSignUpCode({ username: email });
      setResendIn(30);
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(err?.message ?? 'Failed to resend code');
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const first = adminFirstName.trim();
    const last = adminLastName.trim();
    if (!first || !last) {
      setError('Please enter your first and last name.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const tempPassword = sessionStorage.getItem(tempPasswordKey) || '';
    if (!tempPassword) {
      setError('Verification session expired. Please register again.');
      return;
    }
    setSubmitting(true);
    try {
      const lowerEmail = email.trim().toLowerCase();
      const signInRes = await signIn({ username: email, password: tempPassword });
      const stepInfo = signInRes.nextStep;
      if (stepInfo.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        await confirmSignIn({ challengeResponse: newPassword });
      } else if (!stepInfo.signInStep || stepInfo.signInStep === 'DONE') {
        // If Cognito does not request a new password challenge (common for regular signUp),
        // explicitly update the password from the temp to the user's chosen password.
        await updatePassword({ oldPassword: tempPassword, newPassword });
      }

      // Persist admin first/last name to Cognito user attributes so the Personal profile can display them
      try {
        await updateUserAttributes({
          userAttributes: {
            given_name: first,
            family_name: last,
          },
        });
      } catch (attrErr) {
        // Non-fatal: proceed even if attributes update fails
        console.error('Failed to update user attributes (name):', attrErr);
      }

      // Create Firm after successful password setup
      let createdFirmId: string | undefined;
      const pending = sessionStorage.getItem(pendingFirmKey);
      if (pending) {
        try {
          const firmPayload = JSON.parse(pending);
          const adminEmailNormalized = String(
            firmPayload.administrator_email || lowerEmail
          )
            .trim()
            .toLowerCase();

          const res = await client.models.Firm.create({
            // Safe defaults first
            firm_name: '',
            address: '',
            city: '',
            country: 'USA',
            state: '',
            zip: '',
            firm_type: 'Other',
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
            load_posts: 0,
            truck_posts: 0,
            // Merge any values captured during registration
            ...firmPayload,
            // Ensure normalized/authoritative admin fields
            administrator_email: adminEmailNormalized,
            administrator_first_name: first,
            administrator_last_name: last,
          });
          createdFirmId = (res as any)?.data?.id ?? (res as any)?.id;
        } catch (err) {
          console.error('Failed to create Firm after verification:', err);
        }
      } else {
        // Fallback: if the pending payload is missing (e.g., cross-device verification),
        // still create a minimal Firm linked to the user's email.
        try {
          const res2 = await client.models.Firm.create({
            firm_name: '',
            address: '',
            city: '',
            country: 'USA',
            administrator_email: lowerEmail,
            administrator_first_name: first,
            administrator_last_name: last,
            state: '',
            zip: '',
            firm_type: 'Other',
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
            load_posts: 0,
            truck_posts: 0,
          });
          createdFirmId = (res2 as any)?.data?.id ?? (res2 as any)?.id;
        } catch (err) {
          console.error('Failed to create fallback Firm after verification:', err);
        }
      }
      // Ensure the admin user is present in Amplify Data as SUPER_MANAGER
      try {
        // Try to find existing user by email (handle auth mode and enum serialization fallbacks)
        const tryListUsers = async () => {
          try {
            const { data, errors } = await client.models.User.list({ authMode: 'userPool' } as any);
            if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
            return data as any[];
          } catch (err: any) {
            const msg = String(err?.message ?? err);
            const isAuth = /Not Authorized|Unauthorized/i.test(msg);
            const isEnumSerialize = /serialize value|Invalid input for Enum/i.test(msg);
            if (isAuth) {
              const { data, errors } = await client.models.User.list({ authMode: 'identityPool' } as any);
              if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
              return data as any[];
            }
            if (isEnumSerialize) {
              const { data } = await (client.models.User.list as any)({ selectionSet: ['id','first_name','last_name','email','phone'], authMode: 'userPool' });
              return data as any[];
            }
            throw err;
          }
        };
        const userList = await tryListUsers();
        const me = userList.find((u: any) => String(u?.email ?? '').trim().toLowerCase() === lowerEmail);
        if (!me) {
          try {
            const res = await client.models.User.create({
              first_name: first,
              last_name: last,
              email: lowerEmail,
              phone: '',
              role: 'SUPER_MANAGER',
              ...(createdFirmId ? { firm_id: createdFirmId } : {}),
            }, { authMode: 'userPool' } as any);
            if (res?.errors?.length) throw new Error(res.errors.map((e: any) => e.message).join(', '));
          } catch (err: any) {
            const msg = String(err?.message ?? err);
            if (/Not Authorized|Unauthorized/i.test(msg)) {
              const res2 = await client.models.User.create({
                first_name: first,
                last_name: last,
                email: lowerEmail,
                phone: '',
                role: 'SUPER_MANAGER',
                ...(createdFirmId ? { firm_id: createdFirmId } : {}),
              }, { authMode: 'identityPool' } as any);
              if (res2?.errors?.length) throw new Error(res2.errors.map((e: any) => e.message).join(', '));
            } else if (/serialize value|Invalid input for Enum/i.test(msg)) {
              // Retry create omitting role if enum serialization fails
              try {
                await client.models.User.create({
                  first_name: first,
                  last_name: last,
                  email: lowerEmail,
                  phone: '',
                ...(createdFirmId ? { firm_id: createdFirmId } : {}),
                } as any, { authMode: 'userPool' } as any);
              } catch {
                await client.models.User.create({
                  first_name: first,
                  last_name: last,
                  email: lowerEmail,
                  phone: '',
                ...(createdFirmId ? { firm_id: createdFirmId } : {}),
                } as any, { authMode: 'identityPool' } as any);
              }
            } else {
              throw err;
            }
          }
        } else {
          // Ensure role is SUPER_MANAGER
          const desired = 'SUPER_MANAGER';
          const current = String(me?.role ?? '').toUpperCase();
          const needsRoleUpdate = current !== desired;
          const needsFirmId = !!createdFirmId && String(me?.firm_id || '') !== String(createdFirmId);
          if ((needsRoleUpdate || needsFirmId) && me?.id) {
            try {
              const res = await client.models.User.update({ id: me.id, ...(needsRoleUpdate ? { role: desired } : {}), ...(needsFirmId ? { firm_id: createdFirmId } : {}) } as any, { authMode: 'userPool' } as any);
              if (res?.errors?.length) throw new Error(res.errors.map((e: any) => e.message).join(', '));
            } catch (err: any) {
              const msg = String(err?.message ?? err);
              if (/Not Authorized|Unauthorized/i.test(msg)) {
                const res2 = await client.models.User.update({ id: me.id, ...(needsRoleUpdate ? { role: desired } : {}), ...(needsFirmId ? { firm_id: createdFirmId } : {}) } as any, { authMode: 'identityPool' } as any);
                if (res2?.errors?.length) throw new Error(res2.errors.map((e: any) => e.message).join(', '));
              }
            }
          }
        }
      } catch (userErr) {
        console.error('Failed to upsert admin User after verification:', userErr);
      }

      // Persist Firm ID locally for quick linkage on subsequent pages
      if (createdFirmId) {
        try {
          localStorage.setItem('c2b:myFirmId', String(createdFirmId));
        } catch {}
      }

      // Cleanup and redirect
      sessionStorage.removeItem(tempPasswordKey);
      sessionStorage.removeItem(pendingFirmKey);
      alert('Account verified and password set. You can now sign in.');
      // Ensure we sign out the temporary authenticated session to allow fresh login/registration
      try {
        await signOut({ global: true });
      } catch (signOutErr) {
        // Non-fatal; continue navigation even if global sign-out fails
        console.error('Post-verification sign-out failed:', signOutErr);
      }
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Failed to set password');
    } finally {
      setSubmitting(false);
    }
  };

  const hasError = Boolean(error) && step === 'verify';

  return (
    <Page>
      <Card>
        <Header>
          <BrandMark>
            <Logo src="/logo128.png" alt="Connect2Bulk Logo" />
            <BrandName>Connect2Bulk</BrandName>
          </BrandMark>
          <Title>Email Verification</Title>
          <Subtitle>Verify your email, then set a new password</Subtitle>
        </Header>

        {error && <ErrorBanner role="alert">{error}</ErrorBanner>}

        {step === 'verify' ? (
          <form onSubmit={handleVerify}>
            {email && (
              <InfoText>
                We sent a 6-digit code to <strong>{email}</strong>. Check your inbox or spam folder.
              </InfoText>
            )}
            <FormGroup>
              <Label>Enter 6-digit code</Label>
              <CodeGrid role="group" aria-label="6 digit code" data-error={hasError ? 'true' : 'false'}>
                {codeDigits.map((d, i) => (
                  <DigitInput
                    key={i}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label={`Digit ${i + 1}`}
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onPaste={(e) => handlePaste(i, e)}
                    ref={(el) => { inputsRef.current[i] = el }}
                  />
                ))}
              </CodeGrid>
            </FormGroup>
            <HelpRow>
              <span>Didn't get the code?</span>
              <TextButton type="button" onClick={handleResend} disabled={resendIn > 0}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </TextButton>
            </HelpRow>
            <Primary type="submit" disabled={submitting}>Verify</Primary>
          </form>
        ) : (
          <form onSubmit={handleSetPassword}>
            <FormGroup>
              <Label htmlFor="adminFirstName">First name</Label>
              <Input
                id="adminFirstName"
                type="text"
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                maxLength={100}
                placeholder="Jane"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="adminLastName">Last name</Label>
              <Input
                id="adminLastName"
                type="text"
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                maxLength={100}
                placeholder="Doe"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="newPwd">New password</Label>
              <Input
                id="newPwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="confirmPwd">Confirm new password</Label>
              <Input
                id="confirmPwd"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </FormGroup>
            <Primary type="submit" disabled={submitting}>Set password</Primary>
          </form>
        )}
      </Card>
    </Page>
  );
};

// styled-components below the component
const Page = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: calc(100vw - 2 * clamp(16px, 2vw, 32px));
  padding: clamp(16px, 2vw, 32px);
  background: radial-gradient(1200px 600px at 10% -10%, #e7ebff 0%, rgba(231, 235, 255, 0) 60%),
              radial-gradient(1200px 600px at 110% 110%, #e6fff5 0%, rgba(230, 255, 245, 0) 60%),
              linear-gradient(180deg, #f7f8fb 0%, #f0f2f7 100%);
`;

const Card = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.08);
  padding: clamp(20px, 3vw, 40px);
  width: min(680px, 100%);
  border: 1px solid rgba(40,44,69,0.06);
`;

const Header = styled.div`
  margin-bottom: 16px;
  text-align: center;
`;

const Title = styled.h1`
  margin: 6px 0 4px;
  font-size: clamp(20px, 2.5vw, 28px);
  color: #2a2f45;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #6c757d;
  font-size: 14px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
  text-align: left;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  color: #333;
  font-size: 15px;
  font-weight: 600;
`;

const Input = styled.input`
  width: calc(100% - 2 * clamp(12px, 1.6vw, 16px));
  padding: clamp(10px, 1.4vw, 14px) clamp(12px, 1.6vw, 16px);
  border: none;
  align-self: center;
  border-radius: 10px;
  font: inherit;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
  &:focus { border-color: #282c45; box-shadow: 0 0 0 3px rgba(40,44,69,0.12); };
  &:hover { border-color: #282c45; }
`;

const Primary = styled.button`
  width: calc(100% - 2 * clamp(16px, 2vw, 32px));
  padding: clamp(12px, 1.8vw, 14px);
  border: none;
  border-radius: 10px;
  background: #282c45;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #1e2235; }
`;

const InfoText = styled.p`
  margin: 0 0 12px;
  color: #495057;
  font-size: 14px;
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  50% { transform: translateX(4px); }
  75% { transform: translateX(-2px); }
`;

const CodeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, clamp(42px, 7vw, 56px));
  justify-content: center;
  gap: 12px;
  max-width: 100%;
  align-items: center;
  margin: 4px auto 10px; /* center horizontally */

  &[data-error='true'] {
    animation: ${shake} 180ms ease-in-out;
  }

  &[data-error='true'] input {
    border-color: #b00020;
  }
`;

const DigitInput = styled.input`
  text-align: center;
  font-size: clamp(18px, 3vw, 22px);
  width: clamp(42px, 7vw, 56px);
  height: clamp(48px, 6vw, 56px);
  line-height: clamp(48px, 6vw, 56px); /* vertically center text */
  padding: 0; /* rely on line-height for vertical centering */
  color: #111; /* ensure digits are visible */
  caret-color: #111;
  border: 1px solid #ced4da;
  border-radius: 12px;
  background: #fff;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
  &:focus {
    border-color: #282c45;
    box-shadow: 0 0 0 3px rgba(40, 44, 69, 0.15);
    transform: translateY(-1px);
  }
`;

const HelpRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  align-items: center;
  margin: 2px 0 12px;
  color: #6c757d;
  font-size: 14px;
`;

const TextButton = styled.button`
  background: transparent;
  color: #282c45;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
  &:disabled {
    color: #adb5bd;
    cursor: not-allowed;
    text-decoration: none;
  }
`;

const BrandMark = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f1f3f5;
  margin: 0 auto 8px;
`;

const Logo = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 6px;
`;

const BrandName = styled.span`
  font-weight: 700;
  color: #2a2f45;
`;

const ErrorBanner = styled.div`
  background: #ffe3e3;
  color: #b00020;
  border: 1px solid #ffb3b3;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 8px;
`;

export default EmailVerification;
