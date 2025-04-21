import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-green-900 to-green-950">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-green-100 mb-4">404 - Page Not Found</h1>
        <p className="text-xl text-green-200 mb-8">
          The organism you're looking for may have gone extinct or adapted to a different environment.
        </p>
        <Link href="/">
          <Button className="bg-green-600 hover:bg-green-500">Return to Home Ecosystem</Button>
        </Link>
      </div>
    </div>
  )
}
