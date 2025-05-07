"use client"

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

// Add this near the top of the file, after the imports
import { useState, useEffect } from "react"

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

// Add these types and variables after initializing Firebase
export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "reconnecting"

// Create a variable to track the global connection status
let globalConnectionStatus: ConnectionStatus = "connecting"
const connectionStatusListeners: ((status: ConnectionStatus) => void)[] = []

// Function to update the global connection status
const updateConnectionStatus = (status: ConnectionStatus) => {
  globalConnectionStatus = status
  // Notify all listeners
  connectionStatusListeners.forEach((listener) => listener(status))
}

// Enable offline persistence with increased cache size
try {
  // Enable offline capabilities
  const connectedRef = ref(database, ".info/connected")
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      console.log("Connected to Firebase")
      updateConnectionStatus("connected")
    } else {
      console.log("Disconnected from Firebase")
      updateConnectionStatus("disconnected")
    }
  })
} catch (error) {
  console.error("Error setting up Firebase persistence:", error)
  updateConnectionStatus("disconnected")
}

// Hook to use the connection status
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(globalConnectionStatus)

  useEffect(() => {
    // Add listener
    const listener = (newStatus: ConnectionStatus) => {
      setStatus(newStatus)
    }
    connectionStatusListeners.push(listener)

    // Initial status
    setStatus(globalConnectionStatus)

    // Clean up
    return () => {
      const index = connectionStatusListeners.indexOf(listener)
      if (index > -1) {
        connectionStatusListeners.splice(index, 1)
      }
    }
  }, [])

  return status
}

// Export the current connection status for direct access
export const getConnectionStatus = () => globalConnectionStatus

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
  let playerRef: any = null

  while (retries < maxRetries && !success) {
    try {
      const gameExists = await checkGameExists(gameCode)
      if (!gameExists) {
        throw new Error("Game not found")
      }

      // Add player to game with server timestamp
      const playersRef = ref(database, `games/${gameCode}/players`)
      const newPlayerRef = push(playersRef)
      playerRef = newPlayerRef.key

      await set(newPlayerRef, {
        name: playerName,
        joinedAt: serverTimestamp(),
        online: true,
        lastActive: serverTimestamp(),
      })

      // Store player reference in localStorage for reconnection
      localStorage.setItem(`player_ref_${gameCode}`, newPlayerRef.key || "")

      // Set up disconnect handler
      const onlineRef = ref(database, `games/${gameCode}/players/${newPlayerRef.key}/online`)
      onDisconnect(onlineRef).set(false)

      // Set up heartbeat to keep connection alive
      setupHeartbeat(gameCode, newPlayerRef.key || "")

      success = true
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
    throw lastError || new Error("Failed to join game")
  }
}

// Set up a heartbeat to keep the player's online status updated
const setupHeartbeat = (gameCode: string, playerKey: string) => {
  // Update last active timestamp every 30 seconds
  const heartbeatInterval = setInterval(() => {
    if (!gameCode || !playerKey) {
      clearInterval(heartbeatInterval)
      return
    }

    const lastActiveRef = ref(database, `games/${gameCode}/players/${playerKey}/lastActive`)
    const onlineRef = ref(database, `games/${gameCode}/players/${playerKey}/online`)

    update(ref(database, `games/${gameCode}/players/${playerKey}`), {
      lastActive: serverTimestamp(),
      online: true,
    }).catch((err) => {
      console.error("Error updating heartbeat:", err)
      clearInterval(heartbeatInterval)
    })
  }, 30000) // 30 seconds

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(heartbeatInterval)
  })

  return () => clearInterval(heartbeatInterval)
}

// Reconnect player if they have a stored reference
export const reconnectPlayer = async (gameCode: string) => {
  const playerKey = localStorage.getItem(`player_ref_${gameCode}`)

  if (playerKey) {
    try {
      const playerRef = ref(database, `games/${gameCode}/players/${playerKey}`)
      const snapshot = await get(playerRef)

      if (snapshot.exists()) {
        // Player exists, update online status
        await update(playerRef, {
          online: true,
          lastActive: serverTimestamp(),
        })

        // Set up disconnect handler
        const onlineRef = ref(database, `games/${gameCode}/players/${playerKey}/online`)
        onDisconnect(onlineRef).set(false)

        // Set up heartbeat
        setupHeartbeat(gameCode, playerKey)

        return true
      }
    } catch (error) {
      console.error("Error reconnecting player:", error)
    }
  }

  return false
}

// Add organism to game with retry logic
export const addOrganism = async (gameCode: string, playerName: string, organism: Organism, maxRetries = 3) => {
  let retries = 0
  let success = false
  let lastError: any = null
  let organismWithPlayer: Organism & { playerName: string; id?: string | null } = { ...organism, playerName }

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

// Listen for organisms updates with error handling and reconnection
export const listenForOrganisms = (gameCode: string, callback: (organisms: Organism[]) => void) => {
  const organismsRef = ref(database, `games/${gameCode}/organisms`)
  let isFirstConnect = true
  let retryCount = 0
  const maxRetries = 5
  let retryTimeout: NodeJS.Timeout | null = null

  const setupListener = () => {
    try {
      // Immediately call the callback with an empty array to indicate connection attempt
      if (isFirstConnect) {
        callback([])
      }

      const unsubscribe = onValue(
        organismsRef,
        (snapshot) => {
          // Reset retry count on successful connection
          retryCount = 0
          if (retryTimeout) {
            clearTimeout(retryTimeout)
            retryTimeout = null
          }

          const organisms: Organism[] = []
          snapshot.forEach((childSnapshot) => {
            organisms.push(childSnapshot.val() as Organism)
          })
          callback(organisms)

          // If this is the first successful connection, mark it
          if (isFirstConnect) {
            isFirstConnect = false
            console.log("Successfully connected to organisms data")
          }
        },
        (error) => {
          console.error("Error in organisms listener:", error)

          // Try to reconnect with exponential backoff
          if (retryCount < maxRetries) {
            retryCount++
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 second delay
            console.log(`Retrying organisms listener in ${delay}ms (attempt ${retryCount}/${maxRetries})`)

            retryTimeout = setTimeout(() => {
              if (unsubscribe) unsubscribe()
              setupListener()
            }, delay)
          }
        },
      )

      return unsubscribe
    } catch (error) {
      console.error("Failed to set up organisms listener:", error)

      // Try to reconnect with exponential backoff
      if (retryCount < maxRetries) {
        retryCount++
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 second delay
        console.log(`Retrying organisms listener in ${delay}ms (attempt ${retryCount}/${maxRetries})`)

        retryTimeout = setTimeout(setupListener, delay)
        return () => {
          if (retryTimeout) clearTimeout(retryTimeout)
        }
      }

      return () => {}
    }
  }

  const unsubscribe = setupListener()
  return unsubscribe
}

// Update game state
export const updateGameState = async (gameCode: string, state: GameState) => {
  await set(ref(database, `games/${gameCode}/state`), state)
}

// Listen for game state changes
export const listenForGameState = (gameCode: string, callback: (state: GameState) => void) => {
  const stateRef = ref(database, `games/${gameCode}/state`)
  let retryCount = 0
  const maxRetries = 5
  let retryTimeout: NodeJS.Timeout | null = null

  const setupListener = () => {
    try {
      const unsubscribe = onValue(
        stateRef,
        (snapshot) => {
          // Reset retry count on successful connection
          retryCount = 0
          if (retryTimeout) {
            clearTimeout(retryTimeout)
            retryTimeout = null
          }

          const state = snapshot.val() as GameState
          callback(state)
        },
        (error) => {
          console.error("Error in game state listener:", error)

          // Try to reconnect with exponential backoff
          if (retryCount < maxRetries) {
            retryCount++
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 second delay
            console.log(`Retrying game state listener in ${delay}ms (attempt ${retryCount}/${maxRetries})`)

            retryTimeout = setTimeout(() => {
              if (unsubscribe) unsubscribe()
              setupListener()
            }, delay)
          }
        },
      )

      return unsubscribe
    } catch (error) {
      console.error("Failed to set up game state listener:", error)

      // Try to reconnect with exponential backoff
      if (retryCount < maxRetries) {
        retryCount++
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 second delay
        console.log(`Retrying game state listener in ${delay}ms (attempt ${retryCount}/${maxRetries})`)

        retryTimeout = setTimeout(setupListener, delay)
        return () => {
          if (retryTimeout) clearTimeout(retryTimeout)
        }
      }

      return () => {}
    }
  }

  const unsubscribe = setupListener()
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
  let retryCount = 0
  const maxRetries = 5
  let retryTimeout: NodeJS.Timeout | null = null

  const setupListener = () => {
    try {
      const unsubscribe = onValue(
        environmentRef,
        (snapshot) => {
          // Reset retry count on successful connection
          retryCount = 0
          if (retryTimeout) {
            clearTimeout(retryTimeout)
            retryTimeout = null
          }

          const environment = snapshot.val()
          callback(environment || "Grassland") // Default to Grassland if not set
        },
        (error) => {
          console.error("Error in environment listener:", error)

          // Try to reconnect with exponential backoff
          if (retryCount < maxRetries) {
            retryCount++
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 second delay
            console.log(`Retrying environment listener in ${delay}ms (attempt ${retryCount}/${maxRetries})`)

            retryTimeout = setTimeout(() => {
              if (unsubscribe) unsubscribe()
              setupListener()
            }, delay)
          }
        },
      )

      return unsubscribe
    } catch (error) {
      console.error("Failed to set up environment listener:", error)

      // Try to reconnect with exponential backoff
      if (retryCount < maxRetries) {
        retryCount++
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 second delay
        console.log(`Retrying environment listener in ${delay}ms (attempt ${retryCount}/${maxRetries})`)

        retryTimeout = setTimeout(setupListener, delay)
        return () => {
          if (retryTimeout) clearTimeout(retryTimeout)
        }
      }

      return () => {}
    }
  }

  const unsubscribe = setupListener()
  return unsubscribe
}

// Delete a game
export const deleteGame = async (gameCode: string) => {
  await remove(ref(database, `games/${gameCode}`))
}

export { auth, database }
