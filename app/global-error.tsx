'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Application Error</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md">
            A critical error occurred in the application.
          </p>
          <Button onClick={reset}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
} 