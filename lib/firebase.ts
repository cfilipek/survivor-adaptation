import { initializeApp } from "firebase/app"
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  get,
  update,
  remove,
  onDisconnect,
  serverTimestamp,
} from "firebase/database"
import { getAuth } from "firebase/auth"
import type { Organism, GameState } from "./game-types"

// Your Firebase configuration
// Replace this with your actual Firebase config from the Firebase console
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)
const auth = getAuth(app)

// Enable offline persistence and connection monitoring
let connectionStatus: {
  isConnected: boolean
  isReconnecting: boolean
  lastUpdated: number
  listeners: Set<(status: { isConnected: boolean; isReconnecting: boolean }) => void>
  subscribe: (callback: (status: { isConnected: boolean; isReconnecting: boolean }) => void) => () => void
  updateStatus: (connected: boolean, reconnecting: boolean) => void
}

try {
  // Enable offline capabilities
  const connectedRef = ref(database, ".info/connected")

  // Create a connection status object that components can subscribe to
  connectionStatus = {
    isConnected: true,
    isReconnecting: false,
    lastUpdated: Date.now(),
    listeners: new Set<(status: { isConnected: boolean; isReconnecting: boolean }) => void>(),

    // Method to subscribe to connection changes
    subscribe(callback: (status: { isConnected: boolean; isReconnecting: boolean }) => void) {
      this.listeners.add(callback)
      // Immediately call with current status
      callback({ isConnected: this.isConnected, isReconnecting: this.isReconnecting })
      return () => this.listeners.delete(callback)
    },

    // Method to update status and notify listeners
    updateStatus(connected: boolean, reconnecting: boolean) {
      this.isConnected = connected
      this.isReconnecting = reconnecting
      this.lastUpdated = Date.now()
      this.listeners.forEach((callback) =>
        callback({ isConnected: this.isConnected, isReconnecting: this.isReconnecting }),
      )
    },
  }

  onValue(connectedRef, (snap) => {
    const connected = snap.val() === true

    if (connected) {
      console.log("Connected to Firebase")
      connectionStatus.updateStatus(true, false)
    } else {
      console.log("Disconnected from Firebase")
      connectionStatus.updateStatus(false, true)

      // Set a timeout to check if we're still disconnected after a delay
      setTimeout(() => {
        if (!connectionStatus.isConnected) {
          console.log("Still disconnected after timeout, attempting to reconnect...")
          // Force a reconnection attempt
          database.goOnline()
        }
      }, 5000)
    }
  })

  // Add additional connection state listeners
  const dbRef = ref(database, ".info/serverTimeOffset")
  onValue(
    dbRef,
    () => {
      // If we get here, we have a successful server connection
      if (connectionStatus.isReconnecting) {
        console.log("Successfully reconnected to game session")
        connectionStatus.updateStatus(true, false)
      }
    },
    (error) => {
      console.error("Error connecting to Firebase:", error)
      connectionStatus.updateStatus(false, true)
    },
  )
} catch (error) {
  console.error("Error setting up Firebase persistence:", error)
  if (connectionStatus) {
    connectionStatus.updateStatus(false, false)
  }
}

export { connectionStatus }

// Generate a random 6-character game code
const generateGameCode = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Create a new game
export const createGame = async (hostName: string, settings: any) => {
  let gameCode = generateGameCode()

  // Make sure the game code is unique
  let isUnique = false
  while (!isUnique) {
    const gameRef = ref(database, `games/${gameCode}`)
    const snapshot = await get(gameRef)
    if (!snapshot.exists()) {
      isUnique = true
    } else {
      gameCode = generateGameCode()
    }
  }

  // Create the game in Firebase
  await set(ref(database, `games/${gameCode}`), {
    hostName,
    settings,
    organisms: {},
    players: {},
    createdAt: new Date().toISOString(),
    state: "waiting",
  })

  return gameCode
}

// Check if a game exists
export const checkGameExists = async (gameCode: string) => {
  const gameRef = ref(database, `games/${gameCode}`)
  const snapshot = await get(gameRef)
  return snapshot.exists()
}

// Join a game with retry logic
export const joinGame = async (gameCode: string, playerName: string, maxRetries = 3) => {
  // Check if game exists
  let retries = 0
  let success = false
  let lastError: any = null

  // Update connection status to show we're attempting to connect
  connectionStatus.updateStatus(connectionStatus.isConnected, true)

  while (retries < maxRetries && !success) {
    try {
      const gameExists = await checkGameExists(gameCode)
      if (!gameExists) {
        connectionStatus.updateStatus(true, false) // Reset reconnecting state
        throw new Error("Game not found")
      }

      // Add player to game with server timestamp
      const playersRef = ref(database, `games/${gameCode}/players`)
      const newPlayerRef = push(playersRef)
      await set(newPlayerRef, {
        name: playerName,
        joinedAt: serverTimestamp(),
        online: true,
      })

      // Set up disconnect handler
      const onlineRef = ref(database, `games/${gameCode}/players/${newPlayerRef.key}/online`)
      onDisconnect(onlineRef).set(false)

      success = true
      connectionStatus.updateStatus(true, false) // Reset reconnecting state
      return true
    } catch (error) {
      lastError = error
      retries++
      console.log(`Join attempt ${retries} failed, retrying...`)
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
    }
  }

  if (!success) {
    console.error("Failed to join game after multiple attempts:", lastError)
    connectionStatus.updateStatus(false, false) // Update to disconnected state
    throw lastError || new Error("Failed to join game")
  }
}

// Add organism to game with retry logic
export const addOrganism = async (gameCode: string, playerName: string, organism: Organism, maxRetries = 3) => {
  let retries = 0
  let success = false
  let lastError: any = null
  let organismWithPlayer: Organism & { playerName: string; id?: string | null } = { ...organism, playerName }

  // Update connection status to show we're attempting to connect
  connectionStatus.updateStatus(connectionStatus.isConnected, true)

  while (retries < maxRetries && !success) {
    try {
      const organismsRef = ref(database, `games/${gameCode}/organisms`)
      const newOrganismRef = push(organismsRef)

      organismWithPlayer = {
        ...organism,
        playerName,
        id: newOrganismRef.key,
        createdAt: serverTimestamp(),
      }

      await set(newOrganismRef, organismWithPlayer)
      success = true
      connectionStatus.updateStatus(true, false) // Reset reconnecting state
    } catch (error) {
      lastError = error
      retries++
      console.log(`Organism submission attempt ${retries} failed, retrying...`)
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
    }
  }

  if (!success) {
    console.error("Failed to submit organism after multiple attempts:", lastError)
    connectionStatus.updateStatus(false, false) // Update to disconnected state
    throw lastError || new Error("Failed to submit organism")
  }

  return organismWithPlayer
}

// Get all organisms for a game
export const getOrganisms = async (gameCode: string) => {
  const organismsRef = ref(database, `games/${gameCode}/organisms`)
  const snapshot = await get(organismsRef)

  if (!snapshot.exists()) {
    return []
  }

  const organisms: Organism[] = []
  snapshot.forEach((childSnapshot) => {
    organisms.push(childSnapshot.val() as Organism)
  })

  return organisms
}

// Listen for organisms updates
export const listenForOrganisms = (gameCode: string, callback: (organisms: Organism[]) => void) => {
  const organismsRef = ref(database, `games/${gameCode}/organisms`)

  const unsubscribe = onValue(organismsRef, (snapshot) => {
    const organisms: Organism[] = []
    snapshot.forEach((childSnapshot) => {
      organisms.push(childSnapshot.val() as Organism)
    })
    callback(organisms)
  })

  return unsubscribe
}

// Update game state
export const updateGameState = async (gameCode: string, state: GameState) => {
  await set(ref(database, `games/${gameCode}/state`), state)
}

// Listen for game state changes
export const listenForGameState = (gameCode: string, callback: (state: GameState) => void) => {
  const stateRef = ref(database, `games/${gameCode}/state`)

  const unsubscribe = onValue(stateRef, (snapshot) => {
    const state = snapshot.val() as GameState
    callback(state)
  })

  return unsubscribe
}

// Update organisms (for batch updates)
export const updateOrganisms = async (gameCode: string, organisms: Organism[]) => {
  const updates: Record<string, any> = {}

  organisms.forEach((organism) => {
    if (organism.id) {
      updates[`/games/${gameCode}/organisms/${organism.id}`] = organism
    }
  })

  await update(ref(database), updates)
}

// Update current environment
export const updateCurrentEnvironment = async (gameCode: string, environment: string) => {
  await set(ref(database, `games/${gameCode}/currentEnvironment`), environment)
}

// Listen for current environment changes
export const listenForCurrentEnvironment = (gameCode: string, callback: (environment: string) => void) => {
  const environmentRef = ref(database, `games/${gameCode}/currentEnvironment`)

  const unsubscribe = onValue(environmentRef, (snapshot) => {
    const environment = snapshot.val()
    callback(environment || "Grassland") // Default to Grassland if not set
  })

  return unsubscribe
}

// Delete a game
export const deleteGame = async (gameCode: string) => {
  await remove(ref(database, `games/${gameCode}`))
}

export { auth, database }
