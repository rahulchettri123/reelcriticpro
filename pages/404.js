import Link from 'next/link'
import Head from 'next/head'

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found | ReelCritic</title>
        <meta name="description" content="Sorry, the page you are looking for does not exist." />
      </Head>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Page Not Found</h2>
        <p className="mt-2 text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8">
          <Link href="/">
            <a className="px-4 py-2 font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">
              Go Home
            </a>
          </Link>
        </div>
      </div>
    </>
  )
} 