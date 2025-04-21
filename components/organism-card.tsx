import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Organism } from "@/lib/game-types"

interface OrganismCardProps {
  organism: Organism & { playerName?: string }
}

export default function OrganismCard({ organism }: OrganismCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "thriving":
        return "bg-green-500"
      case "surviving":
        return "bg-yellow-500"
      case "struggling":
        return "bg-orange-500"
      case "extinct":
        return "bg-red-500"
      case "city_survivor":
        return "bg-cyan-500"
      case "city_adapter":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getKingdomEmoji = (kingdom: string) => {
    switch (kingdom) {
      case "Animal":
        return "🦁"
      case "Plant":
        return "🌱"
      case "Fungi":
        return "🍄"
      case "Protist":
        return "🦠"
      case "Bacteria":
        return "🧫"
      default:
        return "🧬"
    }
  }

  const getEnvironmentEmoji = (environment: string) => {
    switch (environment) {
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

  return (
    <Card className={`bg-green-700 border-green-600 ${organism.status === "extinct" ? "opacity-60" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-green-100 flex items-center gap-2">
              {getKingdomEmoji(organism.kingdom)} {organism.name}
            </CardTitle>
            {organism.playerName && <p className="text-sm text-green-300">by {organism.playerName}</p>}
          </div>
          <Badge className={`${getStatusColor(organism.status)} capitalize`}>{organism.status.replace("_", " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-green-200">Kingdom:</span>
            <span className="text-green-100">{organism.kingdom}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-green-200">Environment:</span>
            <span className="text-green-100">
              {getEnvironmentEmoji(organism.environment)} {organism.environment}
            </span>
          </div>

          <div>
            <span className="text-green-200">Adaptations:</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
              {Object.entries(organism.stats).map(
                ([stat, value]) =>
                  value > 0 && (
                    <div key={stat} className="flex justify-between">
                      <span className="text-green-300 capitalize">{stat.replace("_", " ")}</span>
                      <span className="text-green-100">{value}</span>
                    </div>
                  ),
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
