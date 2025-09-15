import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Prefill email from /reset?email=... and go straight to confirm step
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const e = params.get('email');
    if (e) {
      setEmail(e);
      setStep('confirm');
      setInfo('We sent a verification code to your email. Enter it below to set a new password.');
    }
  }, [location.search]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const username = email.trim();
    if (!username) {
      setError('Please enter your email.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ username });
      // Move to confirmation step regardless; Cognito will email a code.
      setStep('confirm');
      setInfo('We sent a verification code to your email.');
    } catch (err: any) {
      console.error('Reset request error:', err);
      setError(err?.message ?? 'Failed to request password reset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCode = async () => {
    setError(null);
    setInfo(null);
    const username = email.trim();
    if (!username) {
      setError('Email missing. Enter your email first.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ username });
      setInfo('We sent a verification code to your email.');
    } catch (err: any) {
      console.error('Send code error:', err);
      setError(err?.message ?? 'Failed to send code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const username = email.trim();
    if (!username) {
      setError('Email missing. Go back and request a code again.');
      return;
    }
    setSubmitting(true);
    try {
      await confirmResetPassword({ username, confirmationCode: code.trim(), newPassword });
      setInfo('Password reset successful. You can now sign in.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error('Confirm reset error:', err);
      setError(err?.message ?? 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <Card>
        <Header>
          <BrandMark>
            <Logo src="/logo128.png" alt="Connect2Bulk Logo" />
            <BrandName>Connect2Bulk</BrandName>
          </BrandMark>
          <Title>Reset Password</Title>
          <Subtitle>{step === 'request' ? 'Request a reset code' : 'Enter code and new password'}</Subtitle>
        </Header>

        {error && <ErrorBanner role="alert">{error}</ErrorBanner>}
        {info && <InfoBanner role="status">{info}</InfoBanner>}

        {step === 'request' ? (
          <form onSubmit={handleRequest}>
            <FormGroup>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormGroup>
            <Primary type="submit" disabled={submitting}>Send code</Primary>
            <TextButton type="button" onClick={() => navigate('/login')}>Back to login</TextButton>
          </form>
        ) : (
          <form onSubmit={handleConfirm}>
            <FormGroup>
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </FormGroup>
            <TextButton type="button" onClick={handleSendCode} style={{ marginTop: -8, marginBottom: 8 }}>Send code to email</TextButton>
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
            <Primary type="submit" disabled={submitting}>Reset password</Primary>
            <TextButton type="button" onClick={() => setStep('request')}>Use a different email</TextButton>
          </form>
        )}
      </Card>
    </Page>
  );
};

// styled-components below the component (per preference)
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
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: clamp(10px, 1.4vw, 14px) clamp(12px, 1.6vw, 16px);
  border: 1px solid #ced4da;
  border-radius: 10px;
  font: inherit;
`;

const Primary = styled.button`
  width: 100%;
  padding: clamp(12px, 1.8vw, 14px);
  border: none;
  border-radius: 10px;
  background: #282c45;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #1e2235; }
`;

const TextButton = styled.button`
  background: transparent;
  color: #282c45;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
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

const InfoBanner = styled.div`
  background: #e6fffa;
  color: #0d9488;
  border: 1px solid #99f6e4;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 8px;
`;

export default ResetPassword;
