import { Loader2 } from 'lucide-react'

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-primary-container animate-spin" strokeWidth={2.5} />
      </div>
    </div>
  )
}
