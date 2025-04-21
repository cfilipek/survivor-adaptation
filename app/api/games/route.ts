import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

// In a real app, this would be a database
const games: Record<string, any> = {}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { hostName, settings } = body

    // Generate a random 6-character game code
    const gameCode = randomBytes(3).toString("hex").toUpperCase()

    // Store game data
    games[gameCode] = {
      hostName,
      settings,
      organisms: [],
      createdAt: new Date(),
      state: "waiting",
    }

    return NextResponse.json({ gameCode })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ games: Object.keys(games).length })
}
