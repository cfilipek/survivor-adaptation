export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-green-900 to-green-950">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-600 border-t-green-300 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-green-100 mb-2">Loading Environment</h2>
        <p className="text-green-200">Preparing your ecosystem simulation...</p>
      </div>
    </div>
  )
}
