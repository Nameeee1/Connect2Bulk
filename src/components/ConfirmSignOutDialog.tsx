import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { Icon } from '@iconify-icon/react'

export type ConfirmSignOutDialogProps = {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmSignOutDialog: React.FC<ConfirmSignOutDialogProps> = ({ open, onConfirm, onCancel }) => {
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }

    window.addEventListener('keydown', onKeyDown)

    // focus the confirm button when opened
    const t = setTimeout(() => confirmRef.current?.focus(), 0)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(t)
    }
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <Overlay role="presentation" onMouseDown={onCancel}>
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-title"
        aria-describedby="signout-description"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <HeaderRow>
          <IconWrap>
            <Icon icon="mdi:logout" />
          </IconWrap>
          <Title id="signout-title">Sign out</Title>
        </HeaderRow>
        <Description id="signout-description">
          Are you sure you want to sign out of Connect2Bulk?
        </Description>
        <Actions>
          <Button type="button" onClick={onCancel} $variant="ghost">Cancel</Button>
          <Button type="button" ref={confirmRef} onClick={onConfirm} $variant="danger">
            Sign out
          </Button>
        </Actions>
      </Dialog>
    </Overlay>,
    document.body
  )
}

export default ConfirmSignOutDialog

// styled-components below component (per project rules)
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2147483640; /* above sidebar and tab */
  background: rgba(2, 6, 23, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`

const Dialog = styled.div`
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  color: #0f172a;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(2, 6, 23, 0.35);
  padding: 20px 18px 16px;

  @media (min-width: 480px) {
    padding: 22px 20px 18px;
  }
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
`

const IconWrap = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(220, 20, 60, 0.12);
  color: #dc143c; /* crimson */
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg { width: 20px; height: 20px; }
`

const Title = styled.h2`
  margin: 0;
  font-size: clamp(18px, 2.6vw, 20px);
  font-weight: 800;
  color: #111827;
`

const Description = styled.p`
  margin: 6px 0 14px;
  color: #374151;
  font-size: clamp(14px, 2.6vw, 15px);
  line-height: 1.45;
`

const Actions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`

type ButtonVariant = 'danger' | 'ghost'

const Button = styled.button<{ $variant: ButtonVariant }>`
  appearance: none;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;

  ${(p) =>
    p.$variant === 'danger'
      ? `
    background: #dc143c;
    color: #fff;
    box-shadow: 0 6px 16px rgba(220, 20, 60, 0.25);
    &:hover { background: #c51236; }
    &:focus-visible { outline: 2px solid #c51236; outline-offset: 2px; }
  `
      : `
    background: transparent;
    color: #0f172a;
    border: 1px solid rgba(15, 23, 42, 0.12);
    &:hover { background: rgba(2, 6, 23, 0.05); }
    &:focus-visible { outline: 2px solid rgba(15, 23, 42, 0.4); outline-offset: 2px; }
  `}
`
