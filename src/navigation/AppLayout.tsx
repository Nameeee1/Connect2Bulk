import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import styled from 'styled-components'
import Sidebar from './Sidebar'

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <Wrapper $collapsed={collapsed}>
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      <Main $collapsed={collapsed}>
        <Outlet />
      </Main>
    </Wrapper>
  )
}

export default AppLayout

// styled-components (kept below the component at module scope per project rules)
const sidebarWidth = '264px'
const breakpoint = '768px' // mobile < 768, tablet/desktop >= 768
const collapsedWidth = '73px'

const Wrapper = styled.div<{ $collapsed: boolean }>`
  display: block;
  min-height: 100dvh;
  width: 100dvw;
  box-sizing: border-box;
  /* Prevent any descendant from causing page-level horizontal scroll */
  overflow-x: hidden;
`

const Main = styled.main<{ $collapsed: boolean }>`
  box-sizing: border-box;
  /* Constrain to viewport width minus sidebar to avoid overflow; use dvw to exclude scrollbar width */
  width: calc(100dvw - ${(p) => (p.$collapsed ? collapsedWidth : sidebarWidth)});
  max-width: calc(100dvw - ${(p) => (p.$collapsed ? collapsedWidth : sidebarWidth)});
  min-width: 0;
  min-height: 100dvh;
  padding: 0;
  position: relative; /* create a local stacking context below the tab */
  z-index: 0;
  margin: 0;
  margin-left: ${(p) => (p.$collapsed ? collapsedWidth : sidebarWidth)};
  
  /* Keep page from introducing horizontal scroll while allowing the fixed tab to overlay */
  overflow-x: hidden;
`
