"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { joinGame } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"

export default function JoinGame() {
  const [gameCode, setGameCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [error, setError] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!playerName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name",
        variant: "destructive",
      })
      return
    }

    if (!gameCode.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a game code",
        variant: "destructive",
      })
      return
    }

    setIsJoining(true)

    try {
      // Join game with retry logic built into the function
      await joinGame(gameCode, playerName)

      // Save player info to localStorage
      localStorage.setItem("playerName", playerName)

      // Redirect to game page
      router.push(`/play/${gameCode}`)
    } catch (error) {
      console.error("Error joining game:", error)
      toast({
        title: "Join Error",
        description: "Failed to join the game. Please check the game code and try again.",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-green-900 to-green-950">
      <Card className="w-full max-w-md bg-green-800 border-green-700">
        <CardHeader>
          <CardTitle className="text-green-100">Join a Game</CardTitle>
          <CardDescription className="text-green-200">Enter the game code provided by your teacher</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gameCode" className="text-green-100">
                Game Code
              </Label>
              <Input
                id="gameCode"
                placeholder="Enter 6-digit code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="bg-green-700 border-green-600 text-green-100 placeholder:text-green-400"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playerName" className="text-green-100">
                Your Name
              </Label>
              <Input
                id="playerName"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-green-700 border-green-600 text-green-100 placeholder:text-green-400"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-500" disabled={isJoining}>
              {isJoining ? "Joining..." : "Join Game"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
