import { NextResponse } from "next/server"

// In a real app, this would be a database
const games: Record<string, any> = {}

export async function POST(request: Request, { params }: { params: { gameCode: string } }) {
  try {
    const { gameCode } = params
    const body = await request.json()
    const { playerName, organism } = body

    // Check if game exists
    if (!games[gameCode]) {
      // For demo purposes, create the game if it doesn't exist
      games[gameCode] = {
        hostName: "Demo Host",
        settings: {},
        organisms: [],
        createdAt: new Date(),
        state: "waiting",
      }
    }

    // Add organism to game
    organism.playerName = playerName
    games[gameCode].organisms = games[gameCode].organisms || []
    games[gameCode].organisms.push(organism)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit organism" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { gameCode: string } }) {
  try {
    const { gameCode } = params

    // Check if game exists
    if (!games[gameCode]) {
      return NextResponse.json({ organisms: [] })
    }

    return NextResponse.json({ organisms: games[gameCode].organisms || [] })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get organisms" }, { status: 500 })
  }
}
