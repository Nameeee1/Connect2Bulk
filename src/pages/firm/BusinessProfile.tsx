import React from 'react';
import styled from 'styled-components';
import BusinessProfile from './tabs/BusinessProfile';

const BusinessProfilePage: React.FC = () => {
  return (
    <Page>
      <Content>
        <Brand>
          <PageName>Business Profile</PageName>
          <Logo src="/logo128.png" alt="Connect2Bulk" />
        </Brand>
        <BusinessProfile />
      </Content>
    </Page>
  );
};

export default BusinessProfilePage;

// styled-components below component per project rules
const Page = styled.div`
  min-height: 100vh;
  width: 100%;
  background-color: #f7f8fb;
  padding: clamp(16px, 2vw, 32px);
  box-sizing: border-box;
`;

const Content = styled.main`
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.06);
  border-radius: 12px;
  padding: clamp(16px, 2.5vw, 24px);
`;

const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const Logo = styled.img`
  width: clamp(20px, 3vw, 28px);
  height: clamp(20px, 3vw, 28px);
  border-radius: 6px;
`;

const PageName = styled.span`
  font-weight: 700;
  color: #2a2f45;
  font-size: clamp(14px, 2vw, 18px);
`;
