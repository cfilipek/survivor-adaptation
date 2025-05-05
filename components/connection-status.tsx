"use client"

// Create a new component to handle connection status display
// This will be a reusable component for showing connection status

import { useEffect, useState } from "react"
import { connectionStatus } from "@/lib/firebase"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

interface ConnectionStatusProps {
  showWhenConnected?: boolean
  className?: string
}

export default function ConnectionStatus({ showWhenConnected = false, className = "" }: ConnectionStatusProps) {
  const [status, setStatus] = useState({
    isConnected: connectionStatus.isConnected,
    isReconnecting: connectionStatus.isReconnecting,
  })

  useEffect(() => {
    const unsubscribe = connectionStatus.subscribe((newStatus) => {
      setStatus(newStatus)
    })

    return () => unsubscribe()
  }, [])

  if (status.isConnected && !status.isReconnecting && !showWhenConnected) {
    return null
  }

  return (
    <div
      className={`flex items-center gap-2 ${className} ${
        status.isReconnecting ? "text-red-500" : status.isConnected ? "text-green-500" : "text-red-500"
      }`}
    >
      {status.isReconnecting ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Reconnecting to game...</span>
        </>
      ) : status.isConnected ? (
        <>
          <CheckCircle className="h-4 w-4" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Disconnected</span>
        </>
      )}
    </div>
  )
}
