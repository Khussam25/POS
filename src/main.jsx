import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import BrowserUnsupported from './components/BrowserUnsupported.jsx'
import { getBrowserSupportIssue } from './utils/browserSupport'

const browserIssue = getBrowserSupportIssue()
const root = createRoot(document.getElementById('root'))

if (browserIssue) {
  root.render(<BrowserUnsupported issue={browserIssue} />)
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
