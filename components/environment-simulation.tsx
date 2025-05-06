"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { Organism, Environment } from "@/lib/game-types"
import OrganismCard from "./organism-card"

interface EnvironmentSimulationProps {
  environment: Environment | "All"
  organisms: Organism[]
  onRunSimulation: () => void
  onNextEnvironment: () => void
  onMoveToCityPhase: () => void
}

export default function EnvironmentSimulation({
  environment,
  organisms,
  onRunSimulation,
  onNextEnvironment,
  onMoveToCityPhase,
}: EnvironmentSimulationProps) {
  const [phase, setPhase] = useState<"intro" | "simulation" | "results">("intro")
  const [event, setEvent] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getEnvironmentDescription = (env: Environment) => {
    switch (env) {
      case "Grassland":
        return "Wide open plains with seasonal rainfall and moderate temperatures. Organisms need adaptations for open spaces and occasional drought."
      case "Desert":
        return "Hot, dry environment with extreme temperature fluctuations. Organisms need adaptations for water conservation and heat resistance."
      case "Tundra":
        return "Cold, harsh environment with permafrost and limited vegetation. Organisms need adaptations for extreme cold and short growing seasons."
      case "Jungle":
        return "Dense, humid forest with high biodiversity. Organisms need adaptations for competition, climbing, and dealing with constant moisture."
      default:
        return "A unique environment with its own challenges."
    }
  }

  const getEnvironmentEmoji = (env: Environment) => {
    switch (env) {
      case "Grassland":
        return "🌾"
      case "Desert":
        return "🏜️"
      case "Tundra":
        return "❄️"
      case "Jungle":
        return "🌴"
      default:
        return "🌍"
    }
  }

  const getRandomEvent = (env: Environment) => {
    const events = {
      Grassland: [
        "A wildfire sweeps through the area!",
        "A drought has reduced available water!",
        "Predators are on the hunt!",
        "A herd of grazers moves through the area!",
        "Heavy rains have created temporary ponds!",
      ],
      Desert: [
        "A sandstorm blocks out the sun!",
        "Temperatures reach extreme highs!",
        "A rare rain shower creates a brief bloom!",
        "Water sources are drying up!",
        "Desert predators are hunting at night!",
      ],
      Tundra: [
        "A blizzard brings extreme cold!",
        "The short summer season begins!",
        "Predators are desperate for food!",
        "The ground is frozen solid!",
        "Migratory animals have arrived!",
      ],
      Jungle: [
        "Heavy rainfall has flooded the forest floor!",
        "A drought has made fruit scarce!",
        "Predators are hunting from the trees!",
        "Disease is spreading through the canopy!",
        "Competition for light is intense!",
      ],
    }

    const environmentEvents = events[env] || events.Grassland
    return environmentEvents[Math.floor(Math.random() * environmentEvents.length)]
  }

  const runSimulation = async () => {
    setIsProcessing(true)
    setPhase("simulation")
    setError(null)

    // For "All" environment, generate a combined event message
    if (environment === "All") {
      const events = ["Grassland", "Desert", "Tundra", "Jungle"]
        .map((env) => `${env}: ${getRandomEvent(env as Environment)}`)
        .join("\n")
      setEvent(events)
    } else {
      setEvent(getRandomEvent(environment as Environment))
    }

    try {
      // Call the onRunSimulation prop function
      await onRunSimulation()

      // After a delay, show results
      setTimeout(() => {
        setPhase("results")
        setIsProcessing(false)
      }, 3000)
    } catch (err) {
      console.error("Error running simulation:", err)
      setError("An error occurred while running the simulation. Please try again.")
      setPhase("intro")
      setIsProcessing(false)
    }
  }

  const handleNext = () => {
    if (isProcessing) return
    onMoveToCityPhase()
  }

  // Safely filter organisms
  const safeOrganisms = Array.isArray(organisms) ? organisms.filter(Boolean) : []
  const livingOrganisms = safeOrganisms.filter((o) => o.status !== "extinct")

  // Group organisms by environment
  const organismsByEnvironment = safeOrganisms.reduce(
    (acc, organism) => {
      if (!organism || !organism.environment) return acc
      const env = organism.environment
      if (!acc[env]) acc[env] = []
      acc[env].push(organism)
      return acc
    },
    {} as Record<Environment, Organism[]>,
  )

  return (
    <Card className="bg-green-800 border-green-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-green-100 text-2xl">
              {environment === "All" ? "All Environments" : `${environment} Environment`}
            </CardTitle>
            <CardDescription className="text-green-200">
              {phase === "intro" && "Each organism will face its chosen environment"}
              {phase === "simulation" && "Environmental events in progress"}
              {phase === "results" && "Survival results"}
            </CardDescription>
          </div>
          <div className="bg-green-700 px-3 py-1 rounded-md">
            <p className="text-green-100">
              Surviving: {livingOrganisms.length}/{safeOrganisms.length}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {phase === "intro" && (
          <div className="space-y-4">
            {environment === "All" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["Grassland", "Desert", "Tundra", "Jungle"].map((env) => (
                  <div key={env} className="relative h-48 overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-green-700 flex items-center justify-center">
                      <span className="text-4xl">
                        {env === "Grassland" ? "🌾" : env === "Desert" ? "🏜️" : env === "Tundra" ? "❄️" : "🌴"}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 to-transparent flex items-end">
                      <div className="p-4">
                        <h3 className="text-xl font-bold text-green-100">{env}</h3>
                        <p className="text-green-200 text-sm">{getEnvironmentDescription(env as Environment)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative h-64 overflow-hidden rounded-lg">
                <div className="absolute inset-0 bg-green-700 flex items-center justify-center">
                  <span className="text-6xl">{getEnvironmentEmoji(environment as Environment)}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 to-transparent flex items-end">
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-green-100">{environment}</h3>
                    <p className="text-green-200">{getEnvironmentDescription(environment as Environment)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-green-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-green-100 mb-2">Organisms by Environment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(organismsByEnvironment).map(([env, envOrganisms]) => (
                  <div key={env} className="bg-green-600/50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-100 mb-1">{env}</h4>
                    <p className="text-green-200 text-sm mb-2">Organisms: {envOrganisms.length}</p>
                    <div className="flex flex-wrap gap-1">
                      {envOrganisms.map((org) => (
                        <Badge key={org.id} variant="outline" className="text-xs bg-green-700/50">
                          {org.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "simulation" && event && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-24 h-24 rounded-full bg-yellow-500 animate-pulse flex items-center justify-center">
              <span className="text-4xl">⚡</span>
            </div>
            <h3 className="text-2xl font-bold text-yellow-300 text-center">Environmental Events!</h3>
            <div className="text-xl text-green-100 text-center max-w-2xl whitespace-pre-line">{event}</div>
            <p className="text-green-200 animate-pulse">Calculating survival outcomes...</p>
          </div>
        )}

        {phase === "results" && (
          <div className="space-y-6">
            <div className="bg-green-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-green-100 mb-2">Event Results</h3>
              <div className="text-green-200 whitespace-pre-line">{event}</div>
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="bg-green-600 px-3 py-1 rounded">
                  <p className="text-green-100">
                    Thriving: {safeOrganisms.filter((o) => o.status === "thriving").length}
                  </p>
                </div>
                <div className="bg-yellow-600 px-3 py-1 rounded">
                  <p className="text-yellow-100">
                    Surviving: {safeOrganisms.filter((o) => o.status === "surviving").length}
                  </p>
                </div>
                <div className="bg-orange-600 px-3 py-1 rounded">
                  <p className="text-orange-100">
                    Struggling: {safeOrganisms.filter((o) => o.status === "struggling").length}
                  </p>
                </div>
                <div className="bg-red-600 px-3 py-1 rounded">
                  <p className="text-red-100">Extinct: {safeOrganisms.filter((o) => o.status === "extinct").length}</p>
                </div>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="thriving">Thriving</TabsTrigger>
                <TabsTrigger value="surviving">Surviving</TabsTrigger>
                <TabsTrigger value="struggling">Struggling</TabsTrigger>
                <TabsTrigger value="extinct">Extinct</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {safeOrganisms.map((organism, index) => (
                    <OrganismCard key={organism.id || index} organism={organism} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="thriving">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {safeOrganisms
                    .filter((o) => o.status === "thriving")
                    .map((organism, index) => (
                      <OrganismCard key={organism.id || index} organism={organism} />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="surviving">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {safeOrganisms
                    .filter((o) => o.status === "surviving")
                    .map((organism, index) => (
                      <OrganismCard key={organism.id || index} organism={organism} />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="struggling">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {safeOrganisms
                    .filter((o) => o.status === "struggling")
                    .map((organism, index) => (
                      <OrganismCard key={organism.id || index} organism={organism} />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="extinct">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {safeOrganisms
                    .filter((o) => o.status === "extinct")
                    .map((organism, index) => (
                      <OrganismCard key={organism.id || index} organism={organism} />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {phase === "intro" ? (
          <>
            <Button
              variant="outline"
              onClick={onMoveToCityPhase}
              className="border-green-600 text-green-100 hover:bg-green-700"
              disabled={isProcessing}
            >
              Skip to City Phase
            </Button>
            <Button onClick={runSimulation} disabled={isProcessing} className="bg-green-600 hover:bg-green-500">
              {isProcessing ? "Processing..." : "Run Simulation"}
            </Button>
          </>
        ) : phase === "simulation" ? (
          <div className="w-full flex justify-center">
            <p className="text-green-200">Simulation in progress...</p>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={onMoveToCityPhase}
              className="border-green-600 text-green-100 hover:bg-green-700"
              disabled={isProcessing}
            >
              Skip to City Phase
            </Button>
            <Button onClick={handleNext} disabled={isProcessing} className="bg-green-600 hover:bg-green-500">
              Move to City Phase
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
