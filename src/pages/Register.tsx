import React, { useState } from 'react';
import styled from 'styled-components';
import { FIRM_TYPES } from './firm/constants';
import { useNavigate } from 'react-router-dom';
import { signUp } from 'aws-amplify/auth';

const Register: React.FC = () => {
  const navigate = useNavigate();
  // Firm fields
  const [firmName, setFirmName] = useState('');
  const [address, setAddress] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [zip, setZip] = useState('');
  const [firmType, setFirmType] = useState<(typeof FIRM_TYPES)[number]>(FIRM_TYPES[0]);
  const [loadPosts] = useState<number | ''>('');
  const [truckPosts] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const [adminEmail, setAdminEmail] = useState('');
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      firm_name: firmName,
      address,
      administrator_email: adminEmail,
      state: stateCode,
      zip,
      firm_type: firmType,
      load_posts: loadPosts === '' ? 0 : Number(loadPosts),
      truck_posts: truckPosts === '' ? 0 : Number(truckPosts),
    } as const;
    try {
      const email = adminEmail.trim();
      const tmpPwd = `Tmp!${Math.random().toString(36).slice(-8)}A1`;
      // Persist temp password and firm payload for the verification step
      sessionStorage.setItem(`tmpPwd:${email}`, tmpPwd);
      sessionStorage.setItem(`pendingFirm:${email}`, JSON.stringify(payload));

      await signUp({
        username: email,
        password: tmpPwd,
        options: { userAttributes: { email } },
      });

      alert('We sent a 6-digit verification code to your email.');
      navigate(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error('Registration error:', err);
      alert((err as any)?.message ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  

  return (
    <PageContainer>
      <BackButton type="button" onClick={() => navigate('/login')} aria-label="Back">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
          <line x1="9" y1="12" x2="21" y2="12" />
        </svg>
      </BackButton>
      <Card>
        <BrandHeader>
          <LogoContainer>
            <Logo src="/logo128.png" alt="Connect2Bulk Logo" />
          </LogoContainer>
          <Title>Register Firm</Title>
          <Version>v0.0.0</Version>
        </BrandHeader>
        <form onSubmit={handleRegister}>
          <FormColumns>
            <FormCol>
              <FormGroup>
                <Label htmlFor="firmName">Firm Name</Label>
                <Input id="firmName" value={firmName} maxLength={100} placeholder="Acme Logistics LLC" onChange={(e) => setFirmName(e.target.value)} required />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} maxLength={300} placeholder="123 Main St, Suite 100" onChange={(e) => setAddress(e.target.value)} required />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="adminEmail">Administrator Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  maxLength={254}
                  placeholder="admin@company.com"
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </FormGroup>

              <Row>
                <Col>
                  <FormGroup>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={stateCode}
                      maxLength={2}
                      onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                      placeholder="NY"
                      required
                    />
                  </FormGroup>
                </Col>
                <Col>
                  <FormGroup>
                    <Label htmlFor="zip">ZIP</Label>
                    <Input
                      id="zip"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{5}([0-9]{4})?"
                      title="Enter 5 digits or 9 digits (ZIP+4 without hyphen), e.g., 12345 or 123456789"
                      placeholder="12345 or 123456789"
                      maxLength={9}
                      value={zip}
                      onChange={(e) => setZip(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                    />
                  </FormGroup>
                </Col>
              </Row>

              <FormGroup>
                <Label htmlFor="firmType">Firm Type</Label>
                <Select id="firmType" value={firmType} onChange={(e) => setFirmType(e.target.value as (typeof FIRM_TYPES)[number])}>
                  {FIRM_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </FormGroup>

            </FormCol>
          </FormColumns>

          <Primary type="submit" disabled={submitting}>Register Firm</Primary>
        </form>
      </Card>
    </PageContainer>
  );
};

export default Register;

// Styled components (kept under the function per your preference)
const PageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: calc(100vw - 2 * clamp(16px, 2vw, 32px));
  background-color: #f8f9fa;
  padding: clamp(16px, 2vw, 32px);
  position: relative;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  padding: clamp(20px, 3vw, 36px);
  width: 100%;
  max-width: 880px;
  text-align: center;
`;

const LogoContainer = styled.div`
  margin-bottom: 10px;
`;

const Logo = styled.img`
  width: clamp(56px, 10vw, 88px);
  height: clamp(56px, 10vw, 88px);
`;

const Title = styled.h1`
  margin: 0;
  color: #333;
  font-size: clamp(20px, 2.5vw, 28px);
  font-weight: 700;
`;

const Version = styled.p`
  margin: 6px 0 24px;
  color: #6c757d;
  font-size: clamp(12px, 1.5vw, 14px);
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  text-align: left;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #333;
`;

const Input = styled.input`
  width: 100%;
  padding: clamp(10px, 1.4vw, 14px) clamp(12px, 1.6vw, 16px);
  font-size: clamp(14px, 1.8vw, 16px);
  font-family: inherit;
  color: #333;
  background-color: #fff;
  border: 1px solid #cbd5e1; /* slate-300 */
  border-radius: 10px;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  outline: none;
  &::placeholder { font-family: inherit; color: #9aa0a6; }
  &:hover { border-color: #b6c2d1; }
  &:focus {
    border-color: #282c45;
    box-shadow: 0 0 0 3px rgba(40, 44, 69, 0.15);
    background-color: #fff;
  }
  &:disabled {
    background-color: #f1f3f5;
    color: #9aa0a6;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: clamp(10px, 1.4vw, 14px) clamp(12px, 1.6vw, 16px);
  font-size: clamp(14px, 1.8vw, 16px);
  font-family: inherit;
  color: #333;
  background-color: #fff;
  border: 1px solid #cbd5e1; /* slate-300 */
  border-radius: 10px;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 18px 18px;
  padding-right: 44px;
  &:hover { border-color: #b6c2d1; }
  &:focus {
    border-color: #282c45;
    box-shadow: 0 0 0 3px rgba(40, 44, 69, 0.15);
    background-color: #fff;
  }
  &:disabled {
    background-color: #f1f3f5;
    color: #9aa0a6;
    cursor: not-allowed;
  }
  & option {
    font-family: inherit;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 12px;
  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const Col = styled.div`
  flex: 1;
`;



const BrandHeader = styled.div`
  text-align: left;
  margin-bottom: 8px;
`;

const BackButton = styled.button`
  position: absolute;
  top: clamp(10px, 2vw, 16px);
  left: clamp(10px, 2vw, 16px);
  background: transparent;
  border: none;
  color: #282c45;
  padding: clamp(6px, 1.2vw, 8px);
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover { background-color: rgba(40, 44, 69, 0.08); }
  svg { width: clamp(20px, 2.5vw, 24px); height: clamp(20px, 2.5vw, 24px); }
`;

const FormColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
`;

const FormCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Button = styled.button`
  width: 100%;
  padding: clamp(12px, 1.8vw, 14px);
  border: none;
  border-radius: 10px;
  font-size: clamp(14px, 1.8vw, 16px);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
`;

const Primary = styled(Button)`
  background-color: #e9ecef;
  color: #333;
  margin-bottom: 20px;
  &:hover { background-color: #dde2e6; }
`;