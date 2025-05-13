"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
// Update the imports to include the new types and constants
import type { Organism, GameState, Environment } from "@/lib/game-types"
import { inherentTraits } from "@/lib/game-types"
import OrganismCard from "@/components/organism-card"
import EnvironmentSimulation from "@/components/environment-simulation"
import CitySimulation from "@/components/city-simulation"
import ResultsDisplay from "@/components/results-display"
import { listenForOrganisms, updateGameState, updateOrganisms, deleteGame } from "@/lib/firebase"
import { useConnectionStatus } from "@/lib/firebase"
import ConnectionStatus from "@/components/connection-status"

export default function HostGame({ params }: { params: { gameCode: string } }) {
  const { gameCode } = params
  const router = useRouter()
  const { toast } = useToast()

  const [hostName, setHostName] = useState("")
  const [gameState, setGameState] = useState<GameState>("waiting")
  const [organisms, setOrganisms] = useState<Organism[]>([])
  const [winners, setWinners] = useState<Organism[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const connectionStatus = useConnectionStatus()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load host info from localStorage
    const storedName = localStorage.getItem("hostName")
    if (storedName) {
      setHostName(storedName)
    } else {
      // If no host name is found, redirect to create page
      router.push("/host/create")
      return
    }

    // Set up Firebase listeners with error handling and retry logic
    let unsubscribe: () => void = () => {}
    let retryCount = 0
    const maxRetries = 5

    const setupListener = () => {
      try {
        // Listen for organisms updates from Firebase
        unsubscribe = listenForOrganisms(gameCode, (updatedOrganisms) => {
          // Ensure we have valid organisms before setting state
          if (Array.isArray(updatedOrganisms)) {
            // Filter out any invalid organisms (missing required fields)
            const validOrganisms = updatedOrganisms.filter(
              (organism) =>
                organism && typeof organism === "object" && organism.name && organism.kingdom && organism.environment,
            )

            setOrganisms(validOrganisms)
            setError(null)
          } else {
            console.warn("Received non-array organisms data:", updatedOrganisms)
            // Set to empty array if we get invalid data
            setOrganisms([])
          }
        })

        retryCount = 0 // Reset retry count on success
      } catch (error) {
        console.error("Error setting up Firebase listener:", error)
        setError("Failed to connect to game data. Please refresh the page.")

        if (retryCount < maxRetries) {
          retryCount++
          console.log(`Retrying listener setup (${retryCount}/${maxRetries})...`)
          // Exponential backoff
          setTimeout(setupListener, 1000 * Math.pow(2, retryCount))
        } else {
          toast({
            title: "Connection Error",
            description: "Failed to connect to the game data after multiple attempts. Please refresh the page.",
            variant: "destructive",
          })
        }
      }
    }

    setupListener()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [gameCode, router, toast])

  const startGame = async () => {
    if (!organisms || organisms.length === 0) {
      toast({
        title: "No Organisms",
        description: "Wait for students to join and create organisms",
        variant: "destructive",
      })
      return
    }

    if (connectionStatus !== "connected") {
      toast({
        title: "Connection Error",
        description: "You appear to be offline. Please check your connection and try again.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Update game state with retry logic
      let success = false
      let attempts = 0
      const maxAttempts = 3

      while (!success && attempts < maxAttempts) {
        try {
          await updateGameState(gameCode, "environment")
          success = true
        } catch (error) {
          attempts++
          console.log(`Start game attempt ${attempts} failed, retrying...`)
          if (attempts >= maxAttempts) throw error
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts))
        }
      }

      setGameState("environment")
    } catch (error) {
      console.error("Error starting game:", error)
      toast({
        title: "Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const runEnvironmentPhase = useCallback(async () => {
    if (!organisms || !Array.isArray(organisms) || organisms.length === 0) {
      toast({
        title: "No Organisms",
        description: "There are no valid organisms to simulate",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Process environment survival for all organisms in their chosen environments
      const updatedOrganisms = organisms.map((organism) => {
        // Skip already extinct organisms or invalid ones
        if (!organism || organism.status === "extinct") return organism

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

      // Update organisms in Firebase with retry logic
      let success = false
      let attempts = 0
      const maxAttempts = 3

      while (!success && attempts < maxAttempts) {
        try {
          await updateOrganisms(gameCode, updatedOrganisms)
          success = true
        } catch (error) {
          attempts++
          console.log(`Update organisms attempt ${attempts} failed, retrying...`)
          if (attempts >= maxAttempts) throw error
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts))
        }
      }

      setOrganisms(updatedOrganisms)

      toast({
        title: "Simulation Complete",
        description: "Environment phase simulation has been completed",
      })
    } catch (error) {
      console.error("Error updating organisms:", error)
      toast({
        title: "Error",
        description: "Failed to update organisms. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [organisms, gameCode, toast])

  const moveToCityPhase = async () => {
    if (connectionStatus !== "connected") {
      toast({
        title: "Connection Error",
        description: "You appear to be offline. Please check your connection and try again.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      await updateGameState(gameCode, "city")
      setGameState("city")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update game state. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const runCityPhase = async () => {
    if (!organisms || !Array.isArray(organisms) || organisms.length === 0) {
      toast({
        title: "No Organisms",
        description: "There are no valid organisms to simulate",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Process city challenge for all surviving organisms
      const updatedOrganisms = organisms.map((organism) => {
        // Skip extinct organisms or invalid ones
        if (!organism || organism.status === "extinct") return organism

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

      // Update organisms in Firebase with retry logic
      let success = false
      let attempts = 0
      const maxAttempts = 3

      while (!success && attempts < maxAttempts) {
        try {
          await updateOrganisms(gameCode, updatedOrganisms)
          success = true
        } catch (error) {
          attempts++
          console.log(`Update organisms attempt ${attempts} failed, retrying...`)
          if (attempts >= maxAttempts) throw error
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts))
        }
      }

      setOrganisms(updatedOrganisms)

      // Determine winners
      const survivors = updatedOrganisms.filter((o) => o && o.status !== "extinct")
      setWinners(survivors)

      // Move to results phase
      await updateGameState(gameCode, "results")
      setGameState("results")
    } catch (error) {
      console.error("Error in city phase:", error)
      toast({
        title: "Error",
        description: "Failed to complete city phase. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetGame = async () => {
    if (connectionStatus !== "connected") {
      toast({
        title: "Connection Error",
        description: "You appear to be offline. Please check your connection and try again.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Reset all organisms to alive
      const resetOrganisms = organisms
        .map((organism) => {
          if (!organism) return null
          return {
            ...organism,
            status: "alive",
          }
        })
        .filter(Boolean) as Organism[]

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
      console.error("Error resetting game:", error)
      toast({
        title: "Error",
        description: "Failed to reset game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const endGame = async () => {
    if (connectionStatus !== "connected") {
      toast({
        title: "Connection Error",
        description: "You appear to be offline. Please check your connection and try again.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Delete the game from Firebase
      await deleteGame(gameCode)

      // Clear local storage
      localStorage.removeItem("hostName")
      localStorage.removeItem("gameCode")

      // Redirect to home
      router.push("/")
    } catch (error) {
      console.error("Error ending game:", error)
      toast({
        title: "Error",
        description: "Failed to end game. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  // If there's a connection error, show an error message
  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-green-900 to-green-950">
        <Card className="w-full max-w-md bg-green-800 border-green-700">
          <CardHeader>
            <CardTitle className="text-green-100">Connection Error</CardTitle>
            <CardDescription className="text-green-200">There was a problem connecting to the game</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="border-green-600 text-green-100 hover:bg-green-700"
            >
              Return Home
            </Button>
            <Button onClick={() => window.location.reload()} className="bg-green-600 hover:bg-green-500">
              Refresh Page
            </Button>
          </CardFooter>
        </Card>
      </main>
    )
  }

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
              <p className="text-green-100">Players: {organisms?.length || 0}</p>
            </div>

            <ConnectionStatus />

            {gameState === "waiting" ? (
              <Button
                onClick={startGame}
                className="bg-green-600 hover:bg-green-500"
                disabled={isLoading || !organisms || organisms.length === 0 || connectionStatus !== "connected"}
              >
                {isLoading ? "Starting..." : "Start Game"}
              </Button>
            ) : gameState === "results" ? (
              <div className="flex gap-2">
                <Button
                  onClick={resetGame}
                  className="bg-green-600 hover:bg-green-500"
                  disabled={isLoading || connectionStatus !== "connected"}
                >
                  {isLoading ? "Processing..." : "New Round"}
                </Button>
                <Button
                  onClick={endGame}
                  variant="outline"
                  className="border-green-600 text-green-100 hover:bg-green-700"
                  disabled={isLoading || connectionStatus !== "connected"}
                >
                  End Game
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {connectionStatus !== "connected" && connectionStatus !== "connecting" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You appear to be offline. The game will continue when your connection is restored.
            </AlertDescription>
          </Alert>
        )}

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
                {organisms && organisms.length > 0 ? (
                  organisms.map((organism, index) => <OrganismCard key={organism.id || index} organism={organism} />)
                ) : (
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
                disabled={isLoading || connectionStatus !== "connected"}
              >
                Cancel Game
              </Button>
              <Button
                onClick={startGame}
                disabled={isLoading || !organisms || organisms.length === 0 || connectionStatus !== "connected"}
                className="bg-green-600 hover:bg-green-500"
              >
                {isLoading ? "Starting..." : "Start Game"}
              </Button>
            </CardFooter>
          </Card>
        ) : gameState === "environment" ? (
          <EnvironmentSimulation
            environment="All"
            organisms={organisms || []}
            onRunSimulation={runEnvironmentPhase}
            onNextEnvironment={() => {}}
            onMoveToCityPhase={moveToCityPhase}
          />
        ) : gameState === "city" ? (
          <CitySimulation
            organisms={(organisms || []).filter((o) => o && o.status !== "extinct")}
            onRunSimulation={runCityPhase}
          />
        ) : gameState === "results" ? (
          <ResultsDisplay organisms={organisms || []} winners={winners || []} onNewGame={resetGame} />
        ) : null}
      </div>
    </main>
  )
}

// Helper function to calculate environment compatibility
function calculateCompatibility(organism: Organism, environment: Environment): number {
  if (!organism || !organism.stats || typeof organism.stats !== "object") {
    return 0
  }

  let compatibility = 0
  const stats = organism.stats

  // Add inherent trait bonuses
  const traits = inherentTraits[organism.kingdom]
  if (traits && traits.length > 0) {
    traits.forEach((trait) => {
      compatibility += 1.0 // Base bonus for having an inherent trait
    })
  }

  switch (environment) {
    case "Grassland":
      // Animal stats
      compatibility += (stats.agility || 0) * 0.8
      compatibility += (stats.strength || 0) * 0.6
      compatibility += (stats.sociability || 0) * 0.7
      compatibility += (stats.opportunism || 0) * 0.4

      // Plant stats
      compatibility += (stats.photosynthesis || 0) * 1.0
      compatibility += (stats.height || 0) * 0.8
      compatibility += (stats.perennial || 0) * 0.6

      // Fungi stats
      compatibility += (stats.decomposer || 0) * 0.5
      compatibility += (stats.symbiotic || 0) * 0.7

      // Protist stats
      compatibility += (stats.aquatic || 0) * 0.3

      // Bacteria stats
      compatibility += (stats.beneficial || 0) * 0.6

      // Archaea stats
      compatibility += (stats.extremophile || 0) * 0.3

      // Common stats
      compatibility += (stats.heatResistance || 0) * 0.5
      compatibility -= (stats.coldResistance || 0) * 0.3
      break

    case "Desert":
      // Animal stats
      compatibility += (stats.nocturnal || 0) * 0.9
      compatibility += (stats.audacity || 0) * 0.7
      compatibility += (stats.stealth || 0) * 0.6

      // Plant stats
      compatibility += (stats.succulence || 0) * 1.0
      compatibility += (stats.spinescence || 0) * 0.8
      compatibility += (stats.waxiness || 0) * 0.7

      // Fungi stats
      compatibility += (stats.unicellular || 0) * 0.6
      compatibility += (stats.imperfect || 0) * 0.5

      // Protist stats
      compatibility -= (stats.aquatic || 0) * 0.8

      // Bacteria stats
      compatibility += (stats.mutation || 0) * 0.8
      compatibility += (stats.antibioticResistance || 0) * 0.6

      // Archaea stats
      compatibility += (stats.extremophile || 0) * 1.0
      compatibility += (stats.thermophilic || 0) * 0.9
      compatibility += (stats.halophilic || 0) * 0.8

      // Common stats
      compatibility += (stats.heatResistance || 0) * 1.0
      compatibility -= (stats.coldResistance || 0) * 0.8
      break

    case "Tundra":
      // Animal stats
      compatibility += (stats.coldResistance || 0) * 1.0
      compatibility += (stats.sociability || 0) * 0.8
      compatibility += (stats.strength || 0) * 0.7

      // Plant stats
      compatibility += (stats.perennial || 0) * 0.9
      compatibility += (stats.flexibility || 0) * 0.7

      // Fungi stats
      compatibility += (stats.perfect || 0) * 0.6

      // Protist stats
      compatibility += (stats.aquatic || 0) * 0.5
      compatibility += (stats.cilia || 0) * 0.4

      // Bacteria stats
      compatibility += (stats.anaerobic || 0) * 0.7

      // Archaea stats
      compatibility += (stats.extremophile || 0) * 0.9
      compatibility += (stats.psychrophilic || 0) * 1.0

      // Common stats
      compatibility += (stats.coldResistance || 0) * 1.0
      compatibility -= (stats.heatResistance || 0) * 0.8
      break

    case "Jungle":
      // Animal stats
      compatibility += (stats.agility || 0) * 0.9
      compatibility += (stats.acuteSense || 0) * 0.8
      compatibility += (stats.intelligence || 0) * 0.7

      // Plant stats
      compatibility += (stats.photosynthesis || 0) * 0.9
      compatibility += (stats.height || 0) * 0.8
      compatibility += (stats.hairiness || 0) * 0.7

      // Fungi stats
      compatibility += (stats.decomposer || 0) * 0.9
      compatibility += (stats.parasitic || 0) * 0.8
      compatibility += (stats.multicellular || 0) * 0.7

      // Protist stats
      compatibility += (stats.aquatic || 0) * 1.0
      compatibility += (stats.flagella || 0) * 0.7
      compatibility += (stats.photosynthetic || 0) * 0.8

      // Bacteria stats
      compatibility += (stats.aerobic || 0) * 0.7
      compatibility += (stats.coevolution || 0) * 0.8

      // Archaea stats
      compatibility += (stats.acidophilic || 0) * 0.6

      // Common stats
      compatibility += (stats.heatResistance || 0) * 0.7
      compatibility += (stats.coldResistance || 0) * 0.3
      break
  }

  // Kingdom-specific bonuses
  switch (organism.kingdom) {
    case "Animal":
      if (environment === "Grassland") compatibility += 1.0
      if (environment === "Jungle") compatibility += 0.8
      break
    case "Plant":
      if (environment === "Grassland" || environment === "Jungle") compatibility += 1.0
      break
    case "Fungi":
      if (environment === "Jungle") compatibility += 1.0
      break
    case "Protist":
      if (environment === "Jungle") compatibility += 0.8
      break
    case "Bacteria":
      compatibility += 0.5 // Adaptable to all environments
      break
    case "Archaea":
      if (environment === "Desert") compatibility += 1.0
      if (environment === "Tundra") compatibility += 0.8
      break
  }

  return compatibility
}

// Helper function to calculate city compatibility
function calculateCityCompatibility(organism: Organism): number {
  if (!organism || !organism.stats || typeof organism.stats !== "object") {
    return 0
  }

  let compatibility = 0
  const stats = organism.stats

  // Add inherent trait bonuses
  const traits = inherentTraits[organism.kingdom]
  if (traits && traits.length > 0) {
    traits.forEach((trait) => {
      if (trait === "mutation" || trait === "horizontalGeneTransfer") {
        compatibility += 1.5 // Higher bonus for bacterial traits in city
      } else {
        compatibility += 0.5 // Base bonus for having an inherent trait
      }
    })
  }

  // Animal stats
  compatibility += (stats.intelligence || 0) * 1.0
  compatibility += (stats.opportunism || 0) * 0.9
  compatibility += (stats.sociability || 0) * 0.8
  compatibility += (stats.nocturnal || 0) * 0.7
  compatibility += (stats.audacity || 0) * 0.6

  // Plant stats
  compatibility += (stats.flexibility || 0) * 0.7
  compatibility += (stats.annual || 0) * 0.6
  compatibility -= (stats.height || 0) * 0.5

  // Fungi stats
  compatibility += (stats.decomposer || 0) * 0.9
  compatibility += (stats.parasitic || 0) * 0.8
  compatibility += (stats.unicellular || 0) * 0.7

  // Protist stats
  compatibility += (stats.absorptive || 0) * 0.6

  // Bacteria stats
  compatibility += (stats.mutation || 0) * 1.0
  compatibility += (stats.horizontalGeneTransfer || 0) * 0.9
  compatibility += (stats.antibioticResistance || 0) * 0.8
  compatibility += (stats.beneficial || 0) * 0.7

  // Archaea stats
  compatibility += (stats.extremophile || 0) * 0.8
  compatibility += (stats.acidophilic || 0) * 0.7
  compatibility += (stats.alkaliphilic || 0) * 0.6

  // Common stats
  compatibility += (stats.heatResistance || 0) * 0.5

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
    case "Animal":
      compatibility += 0.5
      break
    case "Plant":
      compatibility -= 1
      break
    case "Protist":
      compatibility -= 0.5
      break
  }

  return compatibility
}
