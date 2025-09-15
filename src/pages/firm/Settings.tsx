import React from 'react'
import styled from 'styled-components'

const Settings: React.FC = () => {
  return (
    <Container>
      <Title>Settings</Title>
      <Text>Configure account and app settings.</Text>
    </Container>
  )
}

export default Settings

const Container = styled.div`
  padding: 0;
`

const Title = styled.h3`
  margin: 0 0 8px 0;
  color: #2a2f45;
  font-size: clamp(16px, 2.2vw, 18px);
`

const Text = styled.p`
  margin: 0;
  color: #6c757d;
  font-size: clamp(12px, 1.8vw, 14px);
`
