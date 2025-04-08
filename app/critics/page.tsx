"use client"

import { Feed } from "@/components/feed"
import { PageHeader } from "@/components/page-header"

export default function CriticsPage() {
  return (
    <div className="py-6 px-4 sm:px-6 md:px-8 mx-auto w-full max-w-7xl">
      <PageHeader
        heading="Critics' Feed"
        subheading="See the latest movie reviews and discussions from our community"
      />
      <div className="grid gap-6 lg:gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Feed />
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 shadow-sm md:sticky md:top-[144px]">
            <h3 className="text-xl font-semibold mb-3">Community Guidelines</h3>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Be respectful of others' opinions</li>
              <li>• Provide thoughtful and constructive reviews</li>
              <li>• No spoilers without warnings</li>
              <li>• Keep discussion on-topic</li>
              <li>• Share your unique perspective</li>
            </ul>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Top Genres</h3>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-primary/10 px-3 py-1">Drama</span>
              <span className="rounded-full bg-primary/10 px-3 py-1">Action</span>
              <span className="rounded-full bg-primary/10 px-3 py-1">Comedy</span>
              <span className="rounded-full bg-primary/10 px-3 py-1">Thriller</span>
              <span className="rounded-full bg-primary/10 px-3 py-1">Sci-Fi</span>
              <span className="rounded-full bg-primary/10 px-3 py-1">Horror</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 