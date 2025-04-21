"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Organism } from "@/lib/game-types"
import OrganismCard from "./organism-card"

interface CitySimulationProps {
  organisms: Organism[]
  onRunSimulation: () => void
}

export default function CitySimulation({ organisms, onRunSimulation }: CitySimulationProps) {
  const [phase, setPhase] = useState<"intro" | "simulation" | "results">("intro")
  const [challenge, setChallenge] = useState<string | null>(null)

  const getCityDescription = () => {
    return "The concrete jungle of New York City presents unique challenges. Urban environments have limited natural resources, pollution, artificial lighting, and constant human activity. Only the most adaptable organisms will survive here."
  }

  const getRandomChallenge = () => {
    const challenges = [
      "Navigating through busy streets and traffic!",
      "Finding food in an urban environment!",
      "Dealing with pollution and toxins!",
      "Avoiding human detection and capture!",
      "Competing with urban-adapted species!",
      "Finding shelter in concrete structures!",
      "Dealing with artificial lighting and noise!",
    ]

    return challenges[Math.floor(Math.random() * challenges.length)]
  }

  const runSimulation = () => {
    setPhase("simulation")
    setChallenge(getRandomChallenge())

    // After a delay, run the simulation and show results
    setTimeout(() => {
      onRunSimulation()
      setPhase("results")
    }, 3000)
  }

  return (
    <Card className="bg-green-800 border-green-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-green-100 text-2xl">Final Challenge: New York City</CardTitle>
            <CardDescription className="text-green-200">
              {phase === "intro" && "The ultimate test of adaptation"}
              {phase === "simulation" && "City challenge in progress"}
              {phase === "results" && "Final results"}
            </CardDescription>
          </div>
          <div className="bg-green-700 px-3 py-1 rounded-md">
            <p className="text-green-100">Organisms: {organisms.length}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {phase === "intro" && (
          <div className="space-y-4">
            <div className="relative h-64 overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-green-700 flex items-center justify-center">
                <span className="text-6xl">🏙️</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 to-transparent flex items-end">
                <div className="p-4">
                  <h3 className="text-xl font-bold text-green-100">New York City</h3>
                  <p className="text-green-200">{getCityDescription()}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-green-100 mb-2">Survival Factors</h3>
              <ul className="space-y-1 text-green-200">
                <li>• Adaptability is the most important trait</li>
                <li>• Nocturnal behavior helps avoid human contact</li>
                <li>• Speed and climbing abilities are valuable</li>
                <li>• Bacteria have natural advantages in cities</li>
                <li>• Plants struggle with limited soil and sunlight</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organisms.map((organism, index) => (
                <OrganismCard key={index} organism={organism} />
              ))}
            </div>
          </div>
        )}

        {phase === "simulation" && challenge && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-24 h-24 rounded-full bg-blue-500 animate-pulse flex items-center justify-center">
              <span className="text-4xl">🏙️</span>
            </div>
            <h3 className="text-2xl font-bold text-blue-300 text-center">City Challenge!</h3>
            <p className="text-xl text-green-100 text-center max-w-2xl">{challenge}</p>
            <p className="text-green-200 animate-pulse">Calculating survival outcomes...</p>
          </div>
        )}

        {phase === "results" && (
          <div className="space-y-6">
            <div className="bg-green-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-green-100 mb-2">Challenge Results</h3>
              <p className="text-green-200">{challenge}</p>
              <div className="mt-4 flex gap-4">
                <div className="bg-cyan-600 px-3 py-1 rounded">
                  <p className="text-cyan-100">
                    City Survivors: {organisms.filter((o) => o.status === "city_survivor").length}
                  </p>
                </div>
                <div className="bg-blue-600 px-3 py-1 rounded">
                  <p className="text-blue-100">
                    City Adapters: {organisms.filter((o) => o.status === "city_adapter").length}
                  </p>
                </div>
                <div className="bg-red-600 px-3 py-1 rounded">
                  <p className="text-red-100">Extinct: {organisms.filter((o) => o.status === "extinct").length}</p>
                </div>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="city_survivor">City Survivors</TabsTrigger>
                <TabsTrigger value="city_adapter">City Adapters</TabsTrigger>
                <TabsTrigger value="extinct">Extinct</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organisms.map((organism, index) => (
                    <OrganismCard key={index} organism={organism} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="city_survivor">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organisms
                    .filter((o) => o.status === "city_survivor")
                    .map((organism, index) => (
                      <OrganismCard key={index} organism={organism} />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="city_adapter">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organisms
                    .filter((o) => o.status === "city_adapter")
                    .map((organism, index) => (
                      <OrganismCard key={index} organism={organism} />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="extinct">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organisms
                    .filter((o) => o.status === "extinct")
                    .map((organism, index) => (
                      <OrganismCard key={index} organism={organism} />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        {phase === "intro" ? (
          <Button onClick={runSimulation} className="bg-green-600 hover:bg-green-500">
            Run City Challenge
          </Button>
        ) : phase === "simulation" ? (
          <p className="text-green-200">Simulation in progress...</p>
        ) : null}
      </CardFooter>
    </Card>
  )
}
