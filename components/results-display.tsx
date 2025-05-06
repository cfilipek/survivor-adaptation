"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Organism } from "@/lib/game-types"
import OrganismCard from "./organism-card"

interface ResultsDisplayProps {
  organisms: Organism[]
  winners: Organism[]
  onNewGame: () => void
}

export default function ResultsDisplay({ organisms, winners, onNewGame }: ResultsDisplayProps) {
  // Ensure organisms and winners are arrays and filter out any invalid entries
  const safeOrganisms = Array.isArray(organisms) ? organisms.filter(Boolean) : []
  const safeWinners = Array.isArray(winners) ? winners.filter(Boolean) : []

  // Find the ultimate winner (if any)
  const citySurvivors = safeWinners.filter((o) => o.status === "city_survivor")
  const ultimateWinner =
    citySurvivors.length > 0
      ? citySurvivors[Math.floor(Math.random() * citySurvivors.length)]
      : safeWinners.length > 0
        ? safeWinners[Math.floor(Math.random() * safeWinners.length)]
        : null

  return (
    <Card className="bg-green-800 border-green-700">
      <CardHeader>
        <CardTitle className="text-green-100 text-2xl">Final Results</CardTitle>
        <CardDescription className="text-green-200">The survival of the fittest</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-green-700 p-6 rounded-lg text-center">
          {safeWinners.length > 0 ? (
            <>
              <h3 className="text-xl font-bold text-green-100 mb-2">
                {safeWinners.length} organism{safeWinners.length !== 1 ? "s" : ""} survived!
              </h3>

              {ultimateWinner && (
                <div className="mt-6 p-4 bg-green-600 rounded-lg inline-block">
                  <p className="text-lg text-green-100">The ultimate survivor is:</p>
                  <p className="text-2xl font-bold text-green-50 mt-2">{ultimateWinner.name}</p>
                  <p className="text-green-200 mt-1">
                    {ultimateWinner.kingdom} from {ultimateWinner.environment}
                  </p>
                </div>
              )}
            </>
          ) : (
            <h3 className="text-xl font-bold text-red-300 mb-2">All organisms went extinct! Nature is harsh.</h3>
          )}
        </div>

        <div className="bg-green-700 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-green-100 mb-2">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-600 p-3 rounded text-center">
              <p className="text-sm text-green-200">Total Organisms</p>
              <p className="text-2xl font-bold text-green-50">{safeOrganisms.length}</p>
            </div>
            <div className="bg-cyan-600 p-3 rounded text-center">
              <p className="text-sm text-cyan-200">City Survivors</p>
              <p className="text-2xl font-bold text-cyan-50">
                {safeOrganisms.filter((o) => o.status === "city_survivor").length}
              </p>
            </div>
            <div className="bg-blue-600 p-3 rounded text-center">
              <p className="text-sm text-blue-200">City Adapters</p>
              <p className="text-2xl font-bold text-blue-50">
                {safeOrganisms.filter((o) => o.status === "city_adapter").length}
              </p>
            </div>
            <div className="bg-red-600 p-3 rounded text-center">
              <p className="text-sm text-red-200">Extinct</p>
              <p className="text-2xl font-bold text-red-50">
                {safeOrganisms.filter((o) => o.status === "extinct").length}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="survivors" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="survivors">Survivors</TabsTrigger>
            <TabsTrigger value="extinct">Extinct</TabsTrigger>
            <TabsTrigger value="all">All Organisms</TabsTrigger>
          </TabsList>

          <TabsContent value="survivors">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeWinners.map((organism, index) => (
                <OrganismCard key={organism.id || index} organism={organism} />
              ))}

              {safeWinners.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-red-300 text-lg">No survivors!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="extinct">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeOrganisms
                .filter((o) => o.status === "extinct")
                .map((organism, index) => (
                  <OrganismCard key={organism.id || index} organism={organism} />
                ))}

              {safeOrganisms.filter((o) => o.status === "extinct").length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-green-300 text-lg">No extinctions! All organisms survived!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeOrganisms.map((organism, index) => (
                <OrganismCard key={organism.id || index} organism={organism} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={onNewGame} className="bg-green-600 hover:bg-green-500">
          Start New Game
        </Button>
      </CardFooter>
    </Card>
  )
}
