import { NextResponse } from "next/server"

// In a real app, this would be a database
const games: Record<string, any> = {}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { gameCode, playerName } = body

    // Check if game exists
    if (!games[gameCode]) {
      // For demo purposes, create the game if it doesn't exist
      games[gameCode] = {
        hostName: "Demo Host",
        settings: { allowLateJoin: true },
        organisms: [],
        createdAt: new Date(),
        state: "waiting",
      }
    }

    // Check if game allows late joining
    if (games[gameCode].state !== "waiting" && !games[gameCode].settings.allowLateJoin) {
      return NextResponse.json({ error: "Game has already started" }, { status: 400 })
    }

    // Add player to game
    games[gameCode].players = games[gameCode].players || []
    games[gameCode].players.push({
      name: playerName,
      joinedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 })
  }
}
