import React from 'react'
import styled from 'styled-components'
import { Icon } from '@iconify-icon/react'

interface Props {
  title: string
  description?: string
}

const UnderConstruction: React.FC<Props> = ({ title, description }) => {
  return (
    <Wrapper>
      <Card>
        <Icon icon="mdi:construction" className="icon" aria-hidden="true" />
        <Title>{title}</Title>
        <Subtitle>{description ?? 'This page is under construction. Check back soon.'}</Subtitle>
      </Card>
    </Wrapper>
  )
}

export default UnderConstruction

// styled-components placed below the component at module scope
const Wrapper = styled.div`
  display: grid;
  place-items: center;
  width: 100%;
  min-height: calc(100dvh - 0px);
  padding: clamp(16px, 2vw, 32px);
  box-sizing: border-box;
`

const Card = styled.div`
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.06);
  border-radius: 14px;
  padding: clamp(20px, 3vw, 36px);
  max-width: 680px;
  width: 100%;
  text-align: center;
  color: #2a2f45;

  .icon {
    width: clamp(36px, 6vw, 64px);
    height: clamp(36px, 6vw, 64px);
    color: #dc143c;
    margin-bottom: clamp(10px, 1.6vw, 16px);
  }
`

const Title = styled.h1`
  margin: 0 0 6px 0;
  font-size: clamp(20px, 2.8vw, 28px);
  font-weight: 800;
  color: #2a2f45;
`

const Subtitle = styled.p`
  margin: 0;
  font-size: clamp(13px, 2vw, 16px);
  color: #6c757d;
`
