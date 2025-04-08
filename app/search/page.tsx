"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, Filter, RefreshCcw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchAutocomplete } from "@/components/search-autocomplete"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get("query") || ""

  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<"grid" | "list">("grid")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    }
  }, [initialQuery])

  const handleSearch = async (query: string, forceRefresh = false) => {
    if (!query.trim()) return

    if (forceRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch(`/api/movies/search?query=${encodeURIComponent(query)}${forceRefresh ? '&refresh=true' : ''}`)
      const data = await response.json()

      if (data.results && Array.isArray(data.results)) {
        // Process the results to ensure consistent format
        const processedResults = data.results.map((movie: any) => ({
          id: movie.id || "unknown",
          title: movie.title || movie.primaryTitle || movie.originalTitle || "Unknown Title",
          poster:
            movie.poster ||
            movie.primaryImage ||
            `/placeholder.svg?height=450&width=300&text=${encodeURIComponent(movie.title || "Movie")}`,
          year: movie.year || movie.startYear || movie.releaseDate?.split("-")[0] || "Unknown",
          rating: movie.rating || movie.averageRating || "N/A",
          genres: movie.genres || [],
          description: movie.description || movie.plot || "No description available.",
          localRating: movie.localRating || null,
        }))

        console.log(`Found ${processedResults.length} results for query: "${query}"`)
        setResults(processedResults)
      } else {
        console.log(`No results found for query: "${query}"`)
        setResults([])
      }
    } catch (error) {
      console.error("Error searching movies:", error)
      setResults([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  return (
    <div className="py-6 md:py-10 px-4 sm:px-6 md:px-8 mx-auto w-full max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Discover Movies</h1>
        <SearchAutocomplete initialQuery={initialQuery} onSearch={(query) => handleSearch(query)} className="w-full max-w-lg" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          {results.length > 0 && <p className="text-sm text-muted-foreground">{results.length} results found</p>}
        </div>
        <div className="flex items-center gap-2">
          {initialQuery && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => handleSearch(initialQuery, true)}
              disabled={isRefreshing}
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh Results"}
            </Button>
          )}
          <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")}>
            <TabsList>
              <TabsTrigger value="grid">Grid</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {(loading || isRefreshing) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[2/3] w-full" />
                <CardHeader className="p-4 pb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
        </div>
      ) : results.length > 0 ? (
        <Tabs value={view} className="w-full">
          <TabsContent value="grid" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {results.map((movie) => (
                <Card key={movie.id} className="overflow-hidden">
                  <div className="aspect-[2/3] relative">
                    <Image src={movie.poster || "/placeholder.svg"} alt={movie.title || "Movie poster"} fill className="object-cover" />
                    {movie.localRating && movie.localRating.count > 0 && (
                      <div className="absolute top-2 right-2">
                        <Badge className="flex items-center gap-1 bg-primary text-primary-foreground">
                          <Star className="h-3 w-3 fill-current" />
                          {movie.localRating.average}/5
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg">{movie.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{movie.year}</p>
                  </CardHeader>
                  <CardFooter className="p-4 pt-0 flex-wrap gap-2">
                    {movie.genres &&
                      movie.genres.slice(0, 2).map((genre: string) => (
                        <Badge key={genre} variant="outline" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    <Button asChild variant="ghost" size="sm" className="ml-auto">
                      <Link href={`/details/${movie.id}`}>Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="list" className="mt-0">
            <div className="space-y-4">
              {results.map((movie) => (
                <Card key={movie.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-[150px] aspect-[2/3] relative">
                      <Image src={movie.poster || "/placeholder.svg"} alt={movie.title || "Movie poster"} fill className="object-cover" />
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {movie.title} <span className="text-muted-foreground">({movie.year})</span>
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {movie.localRating && movie.localRating.count > 0 && (
                              <Badge className="flex items-center gap-1 bg-primary text-primary-foreground">
                                <Star className="h-3 w-3 fill-current" />
                                {movie.localRating.average}/5
                              </Badge>
                            )}
                            {movie.genres &&
                              movie.genres.map((genre: string) => (
                                <Badge key={genre} variant="outline" className="text-xs">
                                  {genre}
                                </Badge>
                              ))}
                          </div>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/details/${movie.id}`}>Details</Link>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{movie.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : initialQuery ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground mb-6">We couldn't find any movies matching "{initialQuery}"</p>
          <Button asChild variant="outline">
            <Link href="/search">Clear Search</Link>
          </Button>
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">Search for movies</h3>
          <p className="text-muted-foreground">Enter a movie title in the search box above to find movies</p>
        </div>
      )}
    </div>
  )
}

