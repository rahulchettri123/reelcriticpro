"use client"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h1 className="text-6xl font-bold text-red-500">Oops!</h1>
          <h2 className="mt-4 text-2xl font-semibold">A critical error occurred</h2>
          <p className="mt-2 text-gray-600">
            We're sorry, but something went wrong with the application.
          </p>
          <div className="mt-8">
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      </body>
    </html>
  )
} 