import { createHashRouter, RouterProvider } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/layout/AppShell'
import { BranchListPage } from '@/pages/BranchList'
import { BranchDetailPage } from '@/pages/BranchDetail'
import { SettingsPage } from '@/pages/Settings'

const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <BranchListPage /> },
      { path: '/branch/:name', element: <BranchDetailPage /> },
      { path: '/settings', element: <SettingsPage /> }
    ]
  }
])

function App(): React.JSX.Element {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </TooltipProvider>
  )
}

export default App
