import { GitBranch } from 'lucide-react'

function App(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <GitBranch className="size-12 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Blue Burlap</h1>
        <p className="text-muted-foreground">
          Simplify Salesforce Admin Development with Git
        </p>
        <p className="mt-8 text-sm text-muted-foreground">
          v2 scaffold &middot; Electron + React + TypeScript + Tailwind
        </p>
      </div>
    </div>
  )
}

export default App
