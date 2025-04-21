"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-green-900 to-green-950">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-green-100 mb-4">Something went wrong!</h1>
        <p className="text-xl text-green-200 mb-8">
          An unexpected error occurred in our ecosystem simulation.
        </p>
        <div className="flex flex-col gap-4">
          <Button onClick={() => reset()} className="bg-green-600 hover:bg-green-500">
            Try again
          </Button>
          <Button onClick={() => window.location.href = "/"} variant="outline" className="border-green-600 text-green-100">
            Return to home
          </Button>
        </div>
      </div>
    </div>
  )
}
