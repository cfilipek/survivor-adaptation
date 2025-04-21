"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { createGame } from "@/lib/firebase"

export default function CreateGame() {
  const [hostName, setHostName] = useState("")
  const [gameSettings, setGameSettings] = useState({
    allowLateJoin: true,
    autoAdvance: false,
    showResults: true,
  })
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hostName) {
      toast({
        title: "Missing Information",
        description: "Please enter your name",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      // Create game using Firebase
      const gameCode = await createGame(hostName, gameSettings)

      // Store host info in localStorage
      localStorage.setItem("hostName", hostName)
      localStorage.setItem("gameCode", gameCode)

      // Redirect to the host dashboard
      router.push(`/host/game/${gameCode}`)
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create game. Please try again.",
        variant: "destructive",
      })
      setIsCreating(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-green-900 to-green-950">
      <Card className="w-full max-w-md bg-green-800 border-green-700">
        <CardHeader>
          <CardTitle className="text-green-100">Create a New Game</CardTitle>
          <CardDescription className="text-green-200">Set up your classroom survival simulation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateGame} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="hostName" className="text-green-100">
                Your Name
              </Label>
              <Input
                id="hostName"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="bg-green-700 border-green-600 text-green-100 placeholder:text-green-400"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-green-100">Game Settings</h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowLateJoin" className="text-green-100">
                    Allow Late Joining
                  </Label>
                  <p className="text-xs text-green-300">Players can join after the game has started</p>
                </div>
                <Switch
                  id="allowLateJoin"
                  checked={gameSettings.allowLateJoin}
                  onCheckedChange={(checked) => setGameSettings((prev) => ({ ...prev, allowLateJoin: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoAdvance" className="text-green-100">
                    Auto-Advance Rounds
                  </Label>
                  <p className="text-xs text-green-300">Automatically progress through environments</p>
                </div>
                <Switch
                  id="autoAdvance"
                  checked={gameSettings.autoAdvance}
                  onCheckedChange={(checked) => setGameSettings((prev) => ({ ...prev, autoAdvance: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showResults" className="text-green-100">
                    Show Results
                  </Label>
                  <p className="text-xs text-green-300">Display final results to all players</p>
                </div>
                <Switch
                  id="showResults"
                  checked={gameSettings.showResults}
                  onCheckedChange={(checked) => setGameSettings((prev) => ({ ...prev, showResults: checked }))}
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCreateGame} disabled={isCreating} className="w-full bg-green-600 hover:bg-green-500">
            {isCreating ? "Creating Game..." : "Create Game"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
