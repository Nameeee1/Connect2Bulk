import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Icon } from '@iconify-icon/react'
import { signOut, fetchUserAttributes } from 'aws-amplify/auth'
import ConfirmSignOutDialog from '../components/ConfirmSignOutDialog'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

type SidebarProps = { collapsed: boolean; onToggleCollapse: () => void }

function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const client = useMemo(() => generateClient<Schema>(), [])

  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [company, setCompany] = useState<string>('')

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

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const attrs = await fetchUserAttributes()
        if (!alive) return
        const first = (attrs.given_name || '').trim()
        const last = (attrs.family_name || '').trim()
        const emailRaw = (attrs.email || '').trim()
        const email = emailRaw.toLowerCase()
        setUserName([first, last].filter(Boolean).join(' '))
        setUserEmail(emailRaw)

        // 1) Fetch role from User model by email
        let roleVal: string = ''
        const usersUL: any = await tryList(() => (client.models.User.list as any)({
          filter: { email: { eq: email } },
          limit: 1,
          authMode: 'userPool',
        }))
        let userRow: any = (Array.isArray(usersUL) ? usersUL[0] : usersUL?.[0])
        if (!userRow) {
          const usersIL: any = await tryList(() => (client.models.User.list as any)({
            filter: { email: { eq: email } },
            limit: 1,
            authMode: 'identityPool',
          }))
          userRow = (Array.isArray(usersIL) ? usersIL[0] : usersIL?.[0])
        }
        if (userRow && userRow.role) roleVal = displayRole(userRow.role)
        setUserRole(roleVal)

        // 2) Fetch company from Firm model
        const firmIdKey = 'c2b:myFirmId'
        let firmData: any | null = null
        let persistedId: string | null = null
        try { persistedId = localStorage.getItem(firmIdKey) } catch {}
        if (persistedId) {
          const byIdUL: any = await tryList(() => (client.models.Firm.list as any)({
            filter: { id: { eq: persistedId } }, limit: 1, authMode: 'userPool'
          }))
          firmData = (Array.isArray(byIdUL) ? byIdUL[0] : byIdUL?.[0])
          if (!firmData) {
            const byIdIL: any = await tryList(() => (client.models.Firm.list as any)({
              filter: { id: { eq: persistedId } }, limit: 1, authMode: 'identityPool'
            }))
            firmData = (Array.isArray(byIdIL) ? byIdIL[0] : byIdIL?.[0])
          }
        }
        if (!firmData && email) {
          const byEmailUL: any = await tryList(() => (client.models.Firm.list as any)({
            filter: { administrator_email: { eq: email } }, limit: 1, authMode: 'userPool'
          }))
          firmData = (Array.isArray(byEmailUL) ? byEmailUL[0] : byEmailUL?.[0])
          if (!firmData) {
            const byEmailIL: any = await tryList(() => (client.models.Firm.list as any)({
              filter: { administrator_email: { eq: emailRaw } }, limit: 1, authMode: 'identityPool'
            }))
            firmData = (Array.isArray(byEmailIL) ? byEmailIL[0] : byEmailIL?.[0])
          }
        }
        const name = String((firmData as any)?.firm_name || '').trim()
        setCompany(name)
      } catch (e) {
        // non-fatal
      }
    })()
    return () => { alive = false }
  }, [client])

  const handleSignOut = async () => {
    // Close dialog and sidebar on confirm, then sign out
    setConfirmOpen(false)
    setOpen(false)
    try {
      // Global sign-out revokes the refresh token remotely and clears local session
      await signOut({ global: true })
      navigate('/login', { replace: true })
    } catch (e) {
      console.error('Sign out failed:', e)
      // Navigate to login anyway to avoid trapping the user in a broken state
      navigate('/login', { replace: true })
    }
  }

  const onRequestSignOut = () => {
    // Open confirmation dialog; close sidebar on mobile to declutter
    setOpen(false)
    setConfirmOpen(true)
  }

  const navItems: Array<{
    label: string
    to: string
    end?: boolean
    icon: string
  }> = [
    { label: 'Dashboard', to: '/firm', end: true, icon: 'lucide:layout-dashboard' },
    { label: 'Load Board', to: '/firm/load-board', icon: 'mdi:package-variant-closed' },
    { label: 'Truck Board', to: '/firm/truck-board', icon: 'mdi:truck-outline' },
    { label: 'Admin Console', to: '/firm/admin', icon: 'mdi:office-building-cog' },
    { label: 'Search', to: '/firm/search', icon: 'mdi:magnify' },
    { label: 'Notifications', to: '/firm/notifications', icon: 'mdi:bell-outline' },
    { label: 'Profile', to: '/firm/profile', icon: 'mdi:account-circle-outline' },
  ]

  return (
    <>
      <MobileTopbar>
        <TopbarTitle>Connect2Bulk</TopbarTitle>
        <Hamburger
          aria-label="Open sidebar"
          aria-controls="app-sidebar"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span />
          <span />
          <span />
        </Hamburger>
      </MobileTopbar>

      <Backdrop
        aria-hidden="true"
        $open={open}
        onClick={() => setOpen(false)}
        data-testid="sidebar-backdrop"
      />

      <Aside id="app-sidebar" role="navigation" aria-label="Main" $open={open} $collapsed={collapsed}>
        <Header>
          <Brand>
            <BrandLogo src="/logo.png" alt="Connect2Bulk logo" />
            <BrandText $collapsed={collapsed}>Connect2Bulk</BrandText>
          </Brand>
          <CloseBtn
            aria-label="Close sidebar"
            onClick={() => setOpen(false)}
          >
            ×
          </CloseBtn>
        </Header>
        {/* Collapse tab moved to a portal to avoid any stacking/overflow clipping */}

        <NavList>
          {navItems.map((item) => (
            <li key={item.to}>
              <StyledNavLink
                to={item.to}
                end={(item as any).end}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                onClick={() => setOpen(false)}
                $collapsed={collapsed}
                title={collapsed ? item.label : undefined}
              >
                <Icon icon={item.icon} className="icon" aria-hidden="true" />
                <span>{item.label}</span>
              </StyledNavLink>
            </li>
          ))}
        </NavList>

        <Footer>
          <UserCard>
            <UserAvatar aria-hidden>{(userName || userEmail || 'U').trim().charAt(0).toUpperCase()}</UserAvatar>
            <UserInfo>
              <UserName $collapsed={collapsed}>{userName || userEmail || '—'}</UserName>
              <UserMeta>
                {userRole ? (<BadgeRole>{userRole}</BadgeRole>) : null}
                {company ? (<CompanyLine title={company} $collapsed={collapsed}>{company}</CompanyLine>) : null}
              </UserMeta>
            </UserInfo>
          </UserCard>
          <SignOutButton
            onClick={onRequestSignOut}
            $collapsed={collapsed}
            title={collapsed ? 'Sign out' : undefined}
          >
            <Icon icon="mdi:logout" className="icon" aria-hidden="true" />
            <span>Sign out</span>
          </SignOutButton>
        </Footer>
      </Aside>

      {createPortal(
        <CollapseTab
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
          onClick={onToggleCollapse}
          $collapsed={collapsed}
        >
          <Icon icon={collapsed ? 'lucide:chevrons-right' : 'lucide:chevrons-left'} />
        </CollapseTab>,
        document.body
      )}

      <ConfirmSignOutDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSignOut}
      />
    </>
  )
}

export default Sidebar
export { Sidebar }

/* styled-components (kept below the component at module scope per project rules) */

const sidebarWidth = '264px'
const breakpoint = '768px' // mobile < 768, tablet/desktop >= 768
const collapsedWidth = '73px'

const Aside = styled.aside<{ $open: boolean; $collapsed: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: ${sidebarWidth};
  height: 100dvh;
  background: #0f172a; /* slate-900 */
  color: #e2e8f0; /* slate-200 */
  box-shadow: 0 10px 25px rgba(2, 6, 23, 0.35);
  z-index: 9990; /* ensure sidebar (and tab) stacks above outlet content */
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden; /* prevent horizontal scrollbar in sidebar */
  -webkit-overflow-scrolling: touch;
  transition: transform 280ms ease, width 200ms ease;

  /* Mobile: hidden by default, slide in when open */
  transform: translateX(${(p) => (p.$open ? '0' : '-100%')});

  @media (min-width: ${breakpoint}) {
    transform: none; /* IMPORTANT: avoid creating containing block that clips fixed tab */
    width: ${(p) => (p.$collapsed ? collapsedWidth : sidebarWidth)};
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: #0b1220;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #1f2937;
    border-radius: 6px;
  }
`

const Backdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.5);
  backdrop-filter: saturate(120%) blur(2px);
  z-index: 1000;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? 'auto' : 'none')};
  transition: opacity 200ms ease;

  @media (min-width: ${breakpoint}) {
    display: none;
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  padding: 18px 16px;
  min-height: 60px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.08);
`

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 3px;
`

const BrandLogo = styled.img`
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 6px;
`

const BrandText = styled.span<{ $collapsed: boolean }>`
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #f8fafc; /* slate-50 */
  display: ${(p) => (p.$collapsed ? 'none' : 'inline')};
`

const CloseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  appearance: none;
  background: transparent;
  border: none;
  color: #94a3b8; /* slate-400 */
  font-size: 28px;
  line-height: 1;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;

  @media (min-width: ${breakpoint}) {
    display: none;
  }

  &:hover {
    color: #e2e8f0;
    background: rgba(255, 255, 255, 0.06);
  }
`

const CollapseTab = styled.button<{ $collapsed: boolean }>`
  position: fixed; /* detach from Aside's overflow to avoid x-scrollbars */
  top: 24px; /* align with sidebar header */
  left: calc(${(p) => (p.$collapsed ? collapsedWidth : sidebarWidth)} + 12px);
  transform: translateX(-14px); /* precise 14px protrusion into outlet */
  z-index: 2147483647; /* max practical stacking */
  display: none;
  align-items: center;
  justify-content: center;
  gap: 0;
  appearance: none;
  width: 32px;
  height: 48px;
  padding: 0;
  color: #e2e8f0;
  background: #a00e2b; /* slate-900 slightly different */
  border: none;
  border-left: none;
  border-radius: 0 12px 12px 0; /* folder tab shape */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: left 200ms ease, background 160ms ease, transform 120ms ease, border-color 160ms ease;

  @media (min-width: ${breakpoint}) {
    display: inline-flex;
  }

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: #c51236;
    border: none;
  }

  &:focus-visible {
    outline: 2px solid #dc143c; /* crimson */
    outline-offset: 2px;
  }
`

const NavList = styled.ul`
  list-style: none;
  margin: 8px 0 16px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const StyledNavLink = styled(NavLink)<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(p) => (p.$collapsed ? '0' : '10px')};
  padding: 12px ${(p) => (p.$collapsed ? '10px' : '12px')};
  justify-content: ${(p) => (p.$collapsed ? 'center' : 'flex-start')};
  border-radius: 10px;
  color: #cbd5e1; /* slate-300 */
  text-decoration: none;
  font-size: 15px;
  line-height: 1.2;
  transition: background 160ms ease, color 160ms ease, transform 80ms ease;

  &:hover {
    background: rgba(220, 20, 60, 0.10); /* subtle crimson hover */
    color: #e2e8f0;
  }

  &.active {
    background: linear-gradient(90deg, rgba(220, 20, 60, 0.20), rgba(220, 20, 60, 0.08));
    color: #f8fafc; /* slate-50 */
    box-shadow: inset 2px 0 0 0 #dc143c; /* crimson left inset */
  }

  .icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  span {
    display: ${(p) => (p.$collapsed ? 'none' : 'inline')};
  }
`

const Footer = styled.div`
  margin-top: auto; /* push to bottom */
  padding: 8px;
  border-top: 1px solid rgba(226, 232, 240, 0.08);
`

const SignOutButton = styled.button<{ $collapsed: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: ${(p) => (p.$collapsed ? 'center' : 'flex-start')};
  gap: ${(p) => (p.$collapsed ? '0' : '10px')};
  padding: 12px ${(p) => (p.$collapsed ? '10px' : '12px')};
  appearance: none;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #cbd5e1; /* slate-300 */
  font-size: 15px;
  line-height: 1.2;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, transform 80ms ease;

  &:hover {
    background: rgba(220, 20, 60, 0.10);
    color: #e2e8f0;
  }

  .icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  span {
    display: ${(p) => (p.$collapsed ? 'none' : 'inline')};
  }
`

const MobileTopbar = styled.div`
  position: sticky;
  top: 0;
  left: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: #0f172a;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.08);

  @media (min-width: ${breakpoint}) {
    display: none;
  }
`

const TopbarTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #f8fafc;
`

const Hamburger = styled.button`
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 40px;
  height: 36px;
  appearance: none;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  > span {
    display: block;
    width: 22px;
    height: 2px;
    background: #cbd5e1;
    border-radius: 2px;
  }
`

/* User info panel */
const UserCard = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px 12px 10px 12px;
`

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #a63e1f;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  letter-spacing: 0.3px;
`

const UserInfo = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const UserName = styled.div<{ $collapsed: boolean }>`
  color: #f8fafc;
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: ${(p) => (p.$collapsed ? 'none' : 'block')};
`

const UserMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const BadgeRole = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(13, 110, 253, 0.16);
  color: #93c5fd;
  font-weight: 600;
  font-size: 11px;
`

const CompanyLine = styled.span<{ $collapsed: boolean }>`
  color: #cbd5e1;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: ${(p) => (p.$collapsed ? 'none' : 'inline')};
`