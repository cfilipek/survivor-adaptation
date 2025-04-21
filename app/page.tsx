import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-green-900 to-green-950">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-green-100 mb-4">Survivor: Adaptation</h1>
          <p className="text-xl text-green-200">A multiplayer classroom game about natural selection</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-green-800 border-green-700">
            <CardHeader>
              <CardTitle className="text-green-100">Join as Student</CardTitle>
              <CardDescription className="text-green-200">
                Create your organism and compete for survival
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative w-full h-48 mb-4 bg-green-700 rounded-md flex items-center justify-center">
                <span className="text-6xl">🧬</span>
              </div>
              <p className="text-green-200 text-center mb-4">
                Enter a game code provided by your teacher and create a unique organism with adaptations for survival.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/join" className="w-full">
                <Button className="w-full bg-green-600 hover:bg-green-500">Join a Game</Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="bg-green-800 border-green-700">
            <CardHeader>
              <CardTitle className="text-green-100">Host as Teacher</CardTitle>
              <CardDescription className="text-green-200">Create a game and guide the simulation</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative w-full h-48 mb-4 bg-green-700 rounded-md flex items-center justify-center">
                <span className="text-6xl">👩‍🏫</span>
              </div>
              <p className="text-green-200 text-center mb-4">
                Create a game session, share the code with your students, and guide them through environmental
                challenges.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/host/create" className="w-full">
                <Button className="w-full bg-green-600 hover:bg-green-500">Host a Game</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}
