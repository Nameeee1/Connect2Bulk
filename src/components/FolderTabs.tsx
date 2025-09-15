import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

export type TabItem = {
  id: string
  label: React.ReactNode
  content: React.ReactNode
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
}

export type FolderTabsProps = {
  tabs: TabItem[]
  ariaLabel: string
  initialActiveId?: string
  onChange?: (id: string) => void
  brand?: React.ReactNode
  idPrefix?: string
}

const FolderTabs: React.FC<FolderTabsProps> = ({
  tabs,
  ariaLabel,
  initialActiveId,
  onChange,
  brand,
  idPrefix = 'tabs'
}) => {
  const firstId = tabs[0]?.id
  const [activeId, setActiveId] = useState<string>(initialActiveId ?? firstId)
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeId))

  // Keep an array of button refs for keyboard roving tabindex
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  tabRefs.current = []

  useEffect(() => {
    // If tabs change and the current activeId no longer exists, fallback to first
    if (!tabs.some((t) => t.id === activeId) && tabs.length > 0) {
      setActiveId(tabs[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs])

  const setActive = (id: string, focus = false) => {
    setActiveId(id)
    onChange?.(id)
    if (focus) {
      const i = tabs.findIndex((t) => t.id === id)
      if (i >= 0) tabRefs.current[i]?.focus()
    }
  }

  const onKeyDownTabs = (e: React.KeyboardEvent) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(e.key)) return
    e.preventDefault()

    const count = tabs.length
    let nextIndex = activeIndex
    if (e.key === 'ArrowRight') nextIndex = (activeIndex + 1) % count
    if (e.key === 'ArrowLeft') nextIndex = (activeIndex - 1 + count) % count
    if (e.key === 'Home') nextIndex = 0
    if (e.key === 'End') nextIndex = count - 1

    const next = tabs[nextIndex]
    if (next) setActive(next.id, true)
  }

  const ids = useMemo(() => {
    return tabs.map((t) => ({
      tabId: `tab-${idPrefix}-${t.id}`,
      panelId: `panel-${idPrefix}-${t.id}`,
    }))
  }, [tabs, idPrefix])

  const active = tabs[activeIndex]
  const activeIds = ids[activeIndex]

  return (
    <Tabs>
      <TabHeader>
        <TabList role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDownTabs}>
          {tabs.map((t, i) => (
            <TabButton
              key={t.id}
              type="button"
              role="tab"
              id={ids[i].tabId}
              aria-controls={ids[i].panelId}
              aria-selected={i === activeIndex}
              $active={i === activeIndex}
              tabIndex={i === activeIndex ? 0 : -1}
              ref={(el) => { tabRefs.current[i] = el }}
              onClick={() => setActive(t.id)}
              {...(t.buttonProps || {})}
            >
              {t.label}
            </TabButton>
          ))}
        </TabList>
        {brand ? <BrandSlot>{brand}</BrandSlot> : null}
      </TabHeader>

      <TabPanels>
        {active && activeIds ? (
          <TabPanel id={activeIds.panelId} role="tabpanel" aria-labelledby={activeIds.tabId}>
            {active.content}
          </TabPanel>
        ) : null}
      </TabPanels>
    </Tabs>
  )
}

export default FolderTabs

// styled-components (kept below the component at module scope per project rules)
const Tabs = styled.div`
  margin-top: 12px;
`

const TabHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(40, 44, 69, 0.12);
  padding: 0 2px;
  

`

const BrandSlot = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: auto;
  
`

const TabList = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end; /* align tabs to baseline to avoid extra height */
  overflow-x: auto;
  overflow-y: hidden; /* prevent vertical scroll from overlapping borders */
  flex: 1 1 auto;
  min-width: 0; /* allow shrinking so it scrolls instead of pushing brand */
 
`

const TabButton = styled.button<{ $active: boolean }>`
  appearance: none;
  border: 1px solid ${(p) => (p.$active ? 'rgba(40, 44, 69, 0.20)' : 'rgba(40, 44, 69, 0.16)')};
  background: ${(p) => (p.$active ? '#ffffff' : '#f7f8fb')};
  color: ${(p) => (p.$active ? '#1f2937' : 'rgba(42, 47, 69, 0.75)')};
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  position: relative; /* needed for accent bar */
  border-radius: 12px 12px 0 0;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;

  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;

  ${(p) =>
    p.$active
      ? `
    box-shadow: 0 6px 14px rgba(40, 44, 69, 0.12);
    border-bottom-color: transparent;
    margin-bottom: -1px; /* overlap panel border for active tab */
    z-index: 2;
    border-radius: 0;
  `
      : `
    &:hover { 
      background: #eef1f6;
    }
  `}

  /* Accent bar on top for active tab */
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 3px;
    background: ${(p) => (p.$active ? 'linear-gradient(90deg, #dc143c, #ff6b81)' : 'transparent')};
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    pointer-events: none;
  }

  /* Remove default focus rings across browsers */
  &:hover { outline: none; box-shadow: ${(p) => (p.$active ? '0 6px 14px rgba(40, 44, 69, 0.12)' : 'none')}; }
  &:focus-visible { outline: none; box-shadow: ${(p) => (p.$active ? '0 6px 14px rgba(40, 44, 69, 0.12)' : 'none')}; }
  &:focus { outline: none; box-shadow: ${(p) => (p.$active ? '0 6px 14px rgba(40, 44, 69, 0.12)' : 'none')}; }
  &:active { outline: none; box-shadow: ${(p) => (p.$active ? '0 6px 14px rgba(40, 44, 69, 0.12)' : 'none')}; }
  &:-moz-focusring { outline: none; }
  &::-moz-focus-inner { border: 0; }
  -webkit-tap-highlight-color: transparent;
`

const TabPanels = styled.div`
  margin-top: 0;
`

const TabPanel = styled.section`
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.06);
  border-radius: 12px;
  padding: clamp(14px, 2.2vw, 18px);
`
