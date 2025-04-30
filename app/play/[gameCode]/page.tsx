"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { Organism, Kingdom, Environment, GameState, StatName } from "@/lib/game-types"
import { kingdomStats, contraStats } from "@/lib/game-types"
import { addOrganism, listenForGameState, listenForCurrentEnvironment } from "@/lib/firebase"

export default function PlayGame({ params }: { params: { gameCode: string } }) {
  const { gameCode } = params
  const router = useRouter()
  const { toast } = useToast()

  const [playerName, setPlayerName] = useState("")
  const [gameState, setGameState] = useState<GameState>("waiting")
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment>("Grassland")
  const [organism, setOrganism] = useState<Organism>({
    name: "",
    kingdom: "Animal" as Kingdom,
    environment: "Grassland" as Environment,
    stats: {},
    status: "alive",
  })

  const [availablePoints, setAvailablePoints] = useState(11)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    // Load player info from localStorage
    const storedName = localStorage.getItem("playerName")
    if (storedName) {
      setPlayerName(storedName)
      setOrganism((prev) => ({
        ...prev,
        name: `${storedName}'s Organism`,
      }))
    } else {
      // If no player name is found, redirect to join page
      router.push("/join")
    }

    // Check if this specific game code has been submitted by this player
    const submittedGames = JSON.parse(localStorage.getItem("submittedGames") || "[]")
    if (submittedGames.includes(gameCode)) {
      setHasSubmitted(true)
    }

    // Set up Firebase listeners with error handling
    let unsubscribeGameState: () => void = () => {}
    let unsubscribeEnvironment: () => void = () => {}
    let retryCount = 0
    const maxRetries = 3

    const setupListeners = () => {
      try {
        // Listen for game state changes
        unsubscribeGameState = listenForGameState(gameCode, (state) => {
          setGameState(state || "waiting")
        })

        // Listen for current environment changes
        unsubscribeEnvironment = listenForCurrentEnvironment(gameCode, (environment) => {
          setCurrentEnvironment(environment as Environment)
        })

        retryCount = 0 // Reset retry count on success
      } catch (error) {
        console.error("Error setting up Firebase listeners:", error)

        if (retryCount < maxRetries) {
          retryCount++
          console.log(`Retrying listener setup (${retryCount}/${maxRetries})...`)
          // Exponential backoff
          setTimeout(setupListeners, 1000 * retryCount)
        } else {
          toast({
            title: "Connection Error",
            description: "Failed to connect to the game. Please refresh the page.",
            variant: "destructive",
          })
        }
      }
    }

    setupListeners()

    return () => {
      // Clean up listeners
      if (unsubscribeGameState) unsubscribeGameState()
      if (unsubscribeEnvironment) unsubscribeEnvironment()
    }
  }, [gameCode, router, toast])

  const handleStatChange = (stat: string, value: number) => {
    const currentValue = organism.stats[stat] || 0
    const change = value - currentValue

    if (availablePoints - change < 0) {
      // Not enough points
      toast({
        title: "Not enough points",
        description: "You don't have enough points to increase this stat further.",
        variant: "destructive",
      })
      return
    }

    // Update the stat
    const newStats = { ...organism.stats, [stat]: value }

    // Apply contra-stats effects
    if (contraStats[stat as StatName] && change > 0) {
      contraStats[stat as StatName].forEach((contraStat) => {
        // Reduce contra-stats by 2 points per point added, but don't go below 0
        const currentContraValue = newStats[contraStat] || 0
        const newContraValue = Math.max(0, currentContraValue - change * 2)
        newStats[contraStat] = newContraValue
      })
    }

    setOrganism((prev) => ({
      ...prev,
      stats: newStats,
    }))

    // Recalculate available points
    const usedPoints = Object.values(newStats).reduce((sum, val) => sum + val, 0)
    setAvailablePoints(11 - usedPoints)
  }

  const handleSubmit = async () => {
    if (!organism.name) {
      toast({
        title: "Missing Information",
        description: "Please give your organism a name",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Add organism to Firebase with retry logic built into the function
      await addOrganism(gameCode, playerName, organism)

      // Store this game code in localStorage to prevent resubmission
      const submittedGames = JSON.parse(localStorage.getItem("submittedGames") || "[]")
      if (!submittedGames.includes(gameCode)) {
        submittedGames.push(gameCode)
        localStorage.setItem("submittedGames", JSON.stringify(submittedGames))
      }

      toast({
        title: "Organism Created",
        description: "Your organism has been submitted. Wait for the game to begin!",
      })

      setHasSubmitted(true)
    } catch (err) {
      console.error("Submission error:", err)
      toast({
        title: "Submission Error",
        description: "Failed to submit your organism. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // If the player has submitted their organism, show the waiting screen
  if (hasSubmitted || gameState !== "waiting") {
    return (
      <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-green-900 to-green-950">
        <Card className="w-full max-w-4xl bg-green-800 border-green-700">
          <CardHeader>
            <CardTitle className="text-green-100">
              {gameState === "waiting"
                ? "Waiting for Game to Start"
                : gameState === "environment"
                  ? `Environment Phase: ${organism.environment}`
                  : gameState === "city"
                    ? "City Challenge"
                    : "Results"}
            </CardTitle>
            <CardDescription className="text-green-200">
              Game Code: {gameCode} | Player: {playerName}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-32 h-32 bg-green-700 rounded-full flex items-center justify-center mb-6">
              <div className="text-4xl">🧬</div>
            </div>
            <h3 className="text-xl font-bold text-green-100 mb-2">{organism.name}</h3>
            <p className="text-green-200 mb-6">Your organism has been submitted!</p>
            <p className="text-green-300 text-center max-w-md">
              Watch the teacher's screen to see how your organism performs in the survival challenges.
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Organism creation screen
  const availableStats = kingdomStats[organism.kingdom] || []

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-green-900 to-green-950">
      <Card className="w-full max-w-4xl bg-green-800 border-green-700">
        <CardHeader>
          <CardTitle className="text-green-100">Create Your Organism</CardTitle>
          <CardDescription className="text-green-200">
            Game Code: {gameCode} | Player: {playerName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="stats">Adaptations</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organismName" className="text-green-100">
                  Organism Name
                </Label>
                <Input
                  id="organismName"
                  value={organism.name}
                  onChange={(e) => setOrganism((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-green-700 border-green-600 text-green-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kingdom" className="text-green-100">
                  Kingdom
                </Label>
                <Select
                  value={organism.kingdom}
                  onValueChange={(value: Kingdom) =>
                    setOrganism((prev) => ({
                      ...prev,
                      kingdom: value,
                      stats: {}, // Reset stats when kingdom changes
                    }))
                  }
                >
                  <SelectTrigger className="bg-green-700 border-green-600 text-green-100">
                    <SelectValue placeholder="Select a kingdom" />
                  </SelectTrigger>
                  <SelectContent className="bg-green-700 border-green-600 text-green-100">
                    <SelectItem value="Animal">Animal</SelectItem>
                    <SelectItem value="Plant">Plant</SelectItem>
                    <SelectItem value="Fungi">Fungi</SelectItem>
                    <SelectItem value="Protist">Protist</SelectItem>
                    <SelectItem value="Bacteria">Bacteria</SelectItem>
                    <SelectItem value="Archaea">Archaea</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment" className="text-green-100">
                  Environment
                </Label>
                <Select
                  value={organism.environment}
                  onValueChange={(value: Environment) => setOrganism((prev) => ({ ...prev, environment: value }))}
                >
                  <SelectTrigger className="bg-green-700 border-green-600 text-green-100">
                    <SelectValue placeholder="Select an environment" />
                  </SelectTrigger>
                  <SelectContent className="bg-green-700 border-green-600 text-green-100">
                    <SelectItem value="Grassland">Grassland</SelectItem>
                    <SelectItem value="Desert">Desert</SelectItem>
                    <SelectItem value="Tundra">Tundra</SelectItem>
                    <SelectItem value="Jungle">Jungle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-green-100">Adaptation Points</h3>
                <span className="text-green-100 font-medium">{availablePoints} / 11</span>
              </div>

              <Progress value={((11 - availablePoints) / 11) * 100} className="h-2 bg-green-700" />

              <div className="space-y-6">
                {availableStats.map((stat) => (
                  <div key={stat} className="space-y-2">
                    <div className="flex justify-between">
                      <div>
                        <Label htmlFor={stat} className="text-green-100 capitalize">
                          {stat.replace(/([A-Z])/g, " $1").trim()}
                        </Label>
                        {contraStats[stat] && contraStats[stat].length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {contraStats[stat].map((contraStat) => (
                              <Badge key={contraStat} variant="outline" className="text-xs text-red-300 border-red-400">
                                -{contraStat.replace(/([A-Z])/g, " $1").trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-green-100">{organism.stats[stat] || 0}</span>
                    </div>
                    <Slider
                      id={stat}
                      min={0}
                      max={5}
                      step={1}
                      value={[organism.stats[stat] || 0]}
                      onValueChange={([value]) => handleStatChange(stat, value)}
                      className="bg-green-700"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="bg-green-700 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-green-100 mb-2">{organism.name || "Unnamed Organism"}</h3>
                <p className="text-green-200">Kingdom: {organism.kingdom}</p>
                <p className="text-green-200">Environment: {organism.environment}</p>

                <h4 className="text-lg font-medium text-green-100 mt-4 mb-2">Adaptations:</h4>
                {Object.keys(organism.stats).length > 0 ? (
                  <ul className="grid grid-cols-2 gap-2">
                    {Object.entries(organism.stats).map(
                      ([stat, value]) =>
                        value > 0 && (
                          <li key={stat} className="text-green-200">
                            <span className="capitalize">{stat.replace(/([A-Z])/g, " $1").trim()}</span>: {value}
                          </li>
                        ),
                    )}
                  </ul>
                ) : (
                  <p className="text-green-300 italic">No adaptations selected</p>
                )}
              </div>

              <div className="bg-green-700 p-6 rounded-lg">
                <h4 className="text-lg font-medium text-green-100 mb-2">Compatibility Analysis:</h4>
                <p className="text-green-200">
                  Based on your adaptations, your organism is likely to
                  {calculateCompatibility() >= 8 ? (
                    <span className="text-green-300 font-bold"> thrive</span>
                  ) : calculateCompatibility() >= 5 ? (
                    <span className="text-yellow-300 font-bold"> survive</span>
                  ) : calculateCompatibility() >= 3 ? (
                    <span className="text-orange-400 font-bold"> struggle</span>
                  ) : (
                    <span className="text-red-400 font-bold"> go extinct</span>
                  )}{" "}
                  in its environment.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="border-green-600 text-green-100 hover:bg-green-700"
          >
            Leave Game
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-500">
            {isSubmitting ? "Submitting..." : "Submit Organism"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )

  // Helper function to calculate environment compatibility
  function calculateCompatibility(): number {
    let compatibility = 0
    const stats = organism.stats

    switch (organism.environment) {
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
        if (organism.environment === "Grassland") compatibility += 1.0
        break
      case "Plant":
        if (organism.environment === "Grassland" || organism.environment === "Jungle") compatibility += 1.0
        break
      case "Fungi":
        if (organism.environment === "Jungle") compatibility += 1.0
        break
      case "Protist":
        if (organism.environment === "Jungle") compatibility += 0.5
        break
      case "Bacteria":
      case "Archaea":
        compatibility += 0.5 // Adaptable to all environments
        break
    }

    return compatibility
  }
}
