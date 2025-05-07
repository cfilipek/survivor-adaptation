import { useConnectionStatus } from "@/lib/firebase"

export default function ConnectionStatus() {
  const status = useConnectionStatus()

  if (status === "connected") {
    return null // Don't show anything when connected
  }

  return (
    <div className="bg-yellow-700 px-4 py-2 rounded-md">
      <p className="text-yellow-100">
        {status === "connecting" ? "Connecting..." : status === "reconnecting" ? "Reconnecting..." : "Disconnected"}
      </p>
    </div>
  )
}
