import Link from "next/link"
import { Film } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5" />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} CineVerse. All rights reserved.</p>
        </div>
        <nav className="flex gap-4 sm:gap-6">
          <Link href="/about" className="text-sm text-muted-foreground hover:underline underline-offset-4">
            About
          </Link>
          <Link href="/terms" className="text-sm text-muted-foreground hover:underline underline-offset-4">
            Terms
          </Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:underline underline-offset-4">
            Privacy
          </Link>
          <Link href="/contact" className="text-sm text-muted-foreground hover:underline underline-offset-4">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  )
}

