import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function AppShell(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
