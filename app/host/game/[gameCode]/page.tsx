"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import type { Organism, GameState, Environment } from "@/lib/game-types"
import OrganismCard from "@/components/organism-card"
import EnvironmentSimulation from "@/components/environment-simulation"
import CitySimulation from "@/components/city-simulation"
import ResultsDisplay from "@/components/results-display"
import { listenForOrganisms, updateGameState, updateOrganisms, deleteGame } from "@/lib/firebase"

export default function HostGame({ params }: { params: { gameCode: string } }) {
  const { gameCode } = params
  const router = useRouter()
  const { toast } = useToast()

  const [hostName, setHostName] = useState("")
  const [gameState, setGameState] = useState<GameState>("waiting")
  const [organisms, setOrganisms] = useState<Organism[]>([])
  const [winners, setWinners] = useState<Organism[]>([])

  useEffect(() => {
    // Load host info from localStorage
    const storedName = localStorage.getItem("hostName")
    if (storedName) {
      setHostName(storedName)
    } else {
      // If no host name is found, redirect to create page
      router.push("/host/create")
    }

    // Listen for organisms updates from Firebase
    const unsubscribe = listenForOrganisms(gameCode, (updatedOrganisms) => {
      setOrganisms(updatedOrganisms)
    })

    return () => {
      unsubscribe()
    }
  }, [gameCode, router])

  const startGame = async () => {
    if (organisms.length === 0) {
      toast({
        title: "No Organisms",
        description: "Wait for students to join and create organisms",
        variant: "destructive",
      })
      return
    }

    try {
      await updateGameState(gameCode, "environment")
      setGameState("environment")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start game",
        variant: "destructive",
      })
    }
  }

  const runEnvironmentPhase = async () => {
    console.log("Running environment phase simulation")

    // Process environment survival for all organisms in their chosen environments
    const updatedOrganisms = organisms.map((organism) => {
      // Skip already extinct organisms
      if (organism.status === "extinct") return organism

      // Calculate survival based on organism's chosen environment and stats
      const compatibility = calculateCompatibility(organism, organism.environment)
      let newStatus = organism.status

      if (compatibility >= 8) {
        newStatus = "thriving"
      } else if (compatibility >= 5) {
        newStatus = "surviving"
      } else if (compatibility >= 3) {
        newStatus = "struggling"
      } else {
        newStatus = "extinct"
      }

      return {
        ...organism,
        status: newStatus,
      }
    })

    try {
      // Update organisms in Firebase
      await updateOrganisms(gameCode, updatedOrganisms)
      setOrganisms(updatedOrganisms)

      toast({
        title: "Simulation Complete",
        description: "Environment phase simulation has been completed",
      })
    } catch (error) {
      console.error("Error updating organisms:", error)
      toast({
        title: "Error",
        description: "Failed to update organisms",
        variant: "destructive",
      })
    }
  }

  const moveToCityPhase = async () => {
    try {
      await updateGameState(gameCode, "city")
      setGameState("city")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update game state",
        variant: "destructive",
      })
    }
  }

  const runCityPhase = async () => {
    // Process city challenge for all surviving organisms
    const updatedOrganisms = organisms.map((organism) => {
      // Skip extinct organisms
      if (organism.status === "extinct") return organism

      // Calculate city compatibility
      const cityCompatibility = calculateCityCompatibility(organism)
      let newStatus = organism.status

      if (cityCompatibility >= 5) {
        newStatus = "city_survivor"
      } else if (cityCompatibility >= 3) {
        newStatus = "city_adapter"
      } else {
        newStatus = "extinct"
      }

      return {
        ...organism,
        status: newStatus,
      }
    })

    try {
      // Update organisms in Firebase
      await updateOrganisms(gameCode, updatedOrganisms)
      setOrganisms(updatedOrganisms)

      // Determine winners
      const survivors = updatedOrganisms.filter((o) => o.status !== "extinct")
      setWinners(survivors)

      // Move to results phase
      await updateGameState(gameCode, "results")
      setGameState("results")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update game state",
        variant: "destructive",
      })
    }
  }

  const resetGame = async () => {
    try {
      // Reset all organisms to alive
      const resetOrganisms = organisms.map((organism) => ({
        ...organism,
        status: "alive",
      }))

      await updateOrganisms(gameCode, resetOrganisms)
      await updateGameState(gameCode, "waiting")

      setOrganisms(resetOrganisms)
      setWinners([])
      setGameState("waiting")

      toast({
        title: "Game Reset",
        description: "The game has been reset and is ready for a new round",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset game",
        variant: "destructive",
      })
    }
  }

  const endGame = async () => {
    try {
      // Delete the game from Firebase
      await deleteGame(gameCode)

      // Clear local storage
      localStorage.removeItem("hostName")
      localStorage.removeItem("gameCode")

      // Redirect to home
      router.push("/")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end game",
        variant: "destructive",
      })
    }
  }

  // Group organisms by environment for the environment phase
  const organismsByEnvironment = organisms.reduce(
    (acc, organism) => {
      const env = organism.environment
      if (!acc[env]) acc[env] = []
      acc[env].push(organism)
      return acc
    },
    {} as Record<Environment, Organism[]>,
  )

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-green-900 to-green-950">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-100">Survivor: Adaptation</h1>
            <p className="text-green-200">
              Game Code: <span className="font-bold">{gameCode}</span> | Host: {hostName}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-green-700 px-4 py-2 rounded-md">
              <p className="text-green-100">Players: {organisms.length}</p>
            </div>

            {gameState === "waiting" ? (
              <Button onClick={startGame} className="bg-green-600 hover:bg-green-500">
                Start Game
              </Button>
            ) : gameState === "results" ? (
              <div className="flex gap-2">
                <Button onClick={resetGame} className="bg-green-600 hover:bg-green-500">
                  New Round
                </Button>
                <Button
                  onClick={endGame}
                  variant="outline"
                  className="border-green-600 text-green-100 hover:bg-green-700"
                >
                  End Game
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {gameState === "waiting" ? (
          <Card className="bg-green-800 border-green-700">
            <CardHeader>
              <CardTitle className="text-green-100">Waiting for Players</CardTitle>
              <CardDescription className="text-green-200">
                Share the game code with your students: <span className="font-bold">{gameCode}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organisms.map((organism, index) => (
                  <OrganismCard key={organism.id || index} organism={organism} />
                ))}

                {organisms.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <p className="text-green-200 text-lg">No organisms yet. Waiting for students to join...</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={endGame}
                className="border-green-600 text-green-100 hover:bg-green-700"
              >
                Cancel Game
              </Button>
              <Button onClick={startGame} disabled={organisms.length === 0} className="bg-green-600 hover:bg-green-500">
                Start Game
              </Button>
            </CardFooter>
          </Card>
        ) : gameState === "environment" ? (
          <div className="space-y-8">
            <Card className="bg-green-800 border-green-700">
              <CardHeader>
                <CardTitle className="text-green-100">Environment Phase</CardTitle>
                <CardDescription className="text-green-200">
                  Each organism will face its chosen environment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(organismsByEnvironment).map(([env, envOrganisms]) => (
                    <div key={env} className="bg-green-700 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-green-100 mb-2">{env}</h3>
                      <p className="text-green-200 mb-4">Organisms: {envOrganisms.length}</p>
                      <div className="flex flex-wrap gap-2">
                        {envOrganisms.map((org) => (
                          <Badge key={org.id} className="bg-green-600">
                            {org.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={moveToCityPhase}
                  className="border-green-600 text-green-100 hover:bg-green-700"
                >
                  Skip to City Phase
                </Button>
                <Button onClick={runEnvironmentPhase} className="bg-green-600 hover:bg-green-500">
                  Run Environment Simulation
                </Button>
              </CardFooter>
            </Card>

            <EnvironmentSimulation
              environment="All"
              organisms={organisms}
              onRunSimulation={runEnvironmentPhase}
              onNextEnvironment={() => {}}
              onMoveToCityPhase={moveToCityPhase}
            />
          </div>
        ) : gameState === "city" ? (
          <CitySimulation organisms={organisms.filter((o) => o.status !== "extinct")} onRunSimulation={runCityPhase} />
        ) : gameState === "results" ? (
          <ResultsDisplay organisms={organisms} winners={winners} onNewGame={resetGame} />
        ) : null}
      </div>
    </main>
  )
}

// Helper function to calculate environment compatibility
function calculateCompatibility(organism: Organism, environment: Environment): number {
  let compatibility = 0
  const stats = organism.stats

  switch (environment) {
    case "Grassland":
      compatibility += (stats.agility || 0) * 0.8
      compatibility += (stats.resilience || 0) * 0.6
      compatibility += (stats.heatResistance || 0) * 0.4
      compatibility += (stats.sociability || 0) * 0.5
      compatibility -= (stats.temerity || 0) * 0.3
      break

    case "Desert":
      compatibility += (stats.heatResistance || 0) * 1.0
      compatibility += (stats.resilience || 0) * 0.8
      compatibility += (stats.opportunism || 0) * 0.6
      compatibility -= (stats.coldResistance || 0) * 0.8
      compatibility += (stats.temerity || 0) * 0.4
      break

    case "Tundra":
      compatibility += (stats.coldResistance || 0) * 1.0
      compatibility += (stats.resilience || 0) * 0.8
      compatibility += (stats.sociability || 0) * 0.6
      compatibility -= (stats.heatResistance || 0) * 0.6
      break

    case "Jungle":
      compatibility += (stats.agility || 0) * 0.8
      compatibility += (stats.vision || 0) * 0.7
      compatibility += (stats.intelligence || 0) * 0.5
      compatibility += (stats.heatResistance || 0) * 0.4
      compatibility += (stats.fertility || 0) * 0.6
      break
  }

  // Kingdom-specific bonuses
  switch (organism.kingdom) {
    case "Animal":
      if (environment === "Grassland") compatibility += 1.0
      break
    case "Plant":
      if (environment === "Grassland" || environment === "Jungle") compatibility += 1.0
      break
    case "Fungi":
      if (environment === "Jungle") compatibility += 1.0
      break
    case "Protist":
      if (environment === "Jungle") compatibility += 0.5
      break
    case "Bacteria":
    case "Archaea":
      compatibility += 0.5 // Adaptable to all environments
      break
  }

  return compatibility
}

// Helper function to calculate city compatibility
function calculateCityCompatibility(organism: Organism): number {
  let compatibility = 0
  const stats = organism.stats

  compatibility += (stats.adaptability || 0) * 1.0
  compatibility += (stats.intelligence || 0) * 0.8
  compatibility += (stats.resilience || 0) * 0.7
  compatibility += (stats.resourcefulness || 0) * 0.9
  compatibility += (stats.opportunism || 0) * 0.6
  compatibility += (stats.sociability || 0) * 0.5

  // Kingdom-specific bonuses
  switch (organism.kingdom) {
    case "Bacteria":
      compatibility += 2
      break
    case "Archaea":
      compatibility += 1.5
      break
    case "Fungi":
      compatibility += 1
      break
    case "Plant":
      compatibility -= 1
      break
  }

  return compatibility
}
