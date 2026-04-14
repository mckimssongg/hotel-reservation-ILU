import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

function HelloWorldPage() {
  return (
    <main className="hello-page">
      <h1>Hello World</h1>
      <p>Frontend simplificado temporalmente.</p>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HelloWorldPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
