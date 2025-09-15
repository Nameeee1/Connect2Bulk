import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { signIn } from 'aws-amplify/auth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const username = email.trim();
      const result = await signIn({ username, password });
      const step = result?.nextStep?.signInStep;
      if (!step || step === 'DONE') {
        navigate('/firm', { replace: true });
        return;
      }
      if (step === 'CONFIRM_SIGN_UP') {
        alert('Please verify your email first.');
        navigate(`/verify?email=${encodeURIComponent(email)}`);
        return;
      }
      if (step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        alert('A new password is required. Please set it now.');
        navigate(`/verify?email=${encodeURIComponent(email)}`);
        return;
      }
      if (step === 'RESET_PASSWORD') {
        alert('Password reset required. Use the Forgot Password flow.');
        return;
      }
      alert(`Next step: ${step}`);
    } catch (err: any) {
      console.error('Login error:', err);
      alert(err?.message ?? 'Login failed');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  // Styled components moved below the component to avoid remount on re-render.

  return (
    <LoginContainer>
      <LoginCard>
        <LogoContainer>
          <Logo src="/logo128.png" alt="Connect2Bulk Logo" />
        </LogoContainer>
        <AppTitle>Connect 2 Bulk</AppTitle>
        <AppVersion>v0.0.0</AppVersion>
        
        <form onSubmit={handleLogin}>
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <FormControl
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <PasswordInputContainer>
              <FormControl
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <TogglePassword 
                type="button"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </TogglePassword>
            </PasswordInputContainer>
          </FormGroup>
          
          <LoginButton type="submit">Login</LoginButton>

          <DarkButton type="button" onClick={() => navigate('/register')}>Register</DarkButton>
          <DarkButton type="button" onClick={() => navigate('/reset')}>Forgot Password</DarkButton>
        </form>
      </LoginCard>
    </LoginContainer>
  );
};

// Styled components (module-scoped, placed under the component per preference)
const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 2 * clamp(16px, 2vw, 32px));
  width: calc(100vw - 2 * clamp(16px, 2vw, 32px));
  background-color: #f8f9fa;
  padding: clamp(16px, 2vw, 32px);
`;

const LoginCard = styled.div`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  padding: clamp(20px, 3vw, 36px);
  min-width: 400px;
  max-width: none;
  text-align: center;
  @media (max-width: 768px) {
    min-width: 350px;
  }
  @media (max-width: 425px) {
    min-width: 250px;
  }
`;

const LogoContainer = styled.div`
  margin-bottom: 10px;
`;

const Logo = styled.img`
  width: clamp(56px, 10vw, 88px);
  height: clamp(56px, 10vw, 88px);
`;

const AppTitle = styled.h1`
  margin: 0;
  color: #333;
  font-size: clamp(20px, 2.5vw, 28px);
  font-weight: 700;
`;

const AppVersion = styled.p`
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

const FormControl = styled.input`
  width: 100%;
  padding: clamp(10px, 1.4vw, 14px) clamp(12px, 1.6vw, 16px);
  font-size: clamp(14px, 1.8vw, 16px);
  font-family: inherit;
  border: 1px solid #ced4da;
  border-radius: 10px;
  box-sizing: border-box;
  &::placeholder { font-family: inherit; }
`;

const PasswordInputContainer = styled.div`
  position: relative;
`;

const TogglePassword = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 20px;
    height: 20px;
  }
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

const LoginButton = styled(Button)`
  background-color: #dc143c;
  color: #e0e0e0;
  margin-bottom: 20px;
  
  &:hover {
    background-color: #a20f2c;
    color: #e0e0e0;
  }
`;


const DarkButton = styled(Button)`
  background-color: #282c45;
  color: white;
  margin-bottom: 10px;
  
  &:hover {
    background-color: #1e2235;
    color: #e0e0e0;
  }
`;

export default Login;