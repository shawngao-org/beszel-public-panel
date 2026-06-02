import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { SystemPage } from './pages/SystemPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/system/:id" element={<SystemPage />} />
      </Routes>
    </Router>
  )
}

export default App
