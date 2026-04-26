export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-outline-variant/30" />
            <div className="absolute inset-0 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
            טוען...
          </p>
        </div>
      </div>
    </div>
  )
}
