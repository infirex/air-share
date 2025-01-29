import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Theme } from '@radix-ui/themes'
// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'

const rootElement = document.getElementById('root') as HTMLElement

const Main: React.FC = () => {
  return (
    <Theme accentColor="blue" grayColor="gray" appearance={'dark'}>
      <App />
    </Theme>
  )
}

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<Main />)
} else {
  console.error('Root element not found')
}
