import React from 'react'
import styled from 'styled-components'
import FolderTabs from '../../components/FolderTabs'
import Personal from './tabs/Personal'
import Work from './Work'
import Settings from './Settings'

const Profile: React.FC = () => {
  return (
    <Page>
      <Content>
        <FolderTabs
          ariaLabel="Profile Sections"
          idPrefix="profile"
          tabs={[
            {
              id: 'personal',
              label: 'Personal',
              content: <Personal />,
            },
            {
              id: 'work',
              label: 'Work',
              content: <Work />,
            },
            {
              id: 'settings',
              label: 'Settings',
              content: <Settings />,
            },
          ]}
          brand={
            <Brand>
              <PageName>Profile</PageName>
              <Logo src="/logo128.png" alt="Connect2Bulk" />
            </Brand>
          }
        />
      </Content>
    </Page>
  )
}

export default Profile

// styled-components below component (per project rules)
const Page = styled.div`
  min-height: 100vh;
  width: 100%;
  background-color: #f7f8fb;
  padding: clamp(16px, 2vw, 32px);
  box-sizing: border-box;
`

const Content = styled.main`
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.06);
  border-radius: 12px;
  padding: clamp(16px, 2.5vw, 24px);
`

const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: auto;
`

const Logo = styled.img`
  width: clamp(20px, 3vw, 28px);
  height: clamp(20px, 3vw, 28px);
  border-radius: 6px;
`

const PageName = styled.span`
  font-weight: 700;
  color: #2a2f45;
  font-size: clamp(14px, 2vw, 18px);
`
