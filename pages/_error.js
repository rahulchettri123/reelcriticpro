import Link from 'next/link'

function Error({ statusCode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-6xl font-bold">{statusCode || 404}</h1>
      <h2 className="mt-4 text-2xl font-semibold">
        {statusCode === 404 ? 'Page Not Found' : 'An error occurred'}
      </h2>
      <p className="mt-2 text-gray-600">
        {statusCode === 404
          ? "The page you're looking for doesn't exist or has been moved."
          : "We're sorry, something went wrong."}
      </p>
      <div className="mt-8">
        <Link href="/">
          <a className="px-4 py-2 font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">
            Go Home
          </a>
        </Link>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error 