import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <header className="game-screen flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-12 pb-16 min-h-[85vh]">
        <div className="container max-w-2xl mx-auto flex flex-col items-center text-center">
          <div className="shrink-0 mb-8">
            <Image
              src="/photo.png"
              alt="Pavel Polovinka"
              width={192}
              height={192}
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover ring-2 ring-game-border shadow-game"
              priority
            />
          </div>
          <p className="game-label text-sm sm:text-base tracking-[0.2em] uppercase mb-3">
            Products / Operations / Startups
          </p>
          <h1 className="game-title text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground [text-wrap:balance]">
            Pavel Polovinka
          </h1>
          <p className="mt-4 text-muted-foreground text-sm sm:text-base tracking-wide">
            Jakarta — Singapore — Amsterdam
          </p>
          <nav className="mt-12 flex flex-col sm:flex-row gap-2 sm:gap-6">
            <Link
              href="#contact"
              className="game-menu-item px-5 py-2.5 text-foreground border-2 border-game-border rounded bg-game-panel hover:border-accent hover:bg-game-panel-hover transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <section id="contact" className="game-panel py-10 px-6 sm:px-10 rounded-lg">
          <h2 className="game-label text-xs sm:text-sm tracking-[0.2em] uppercase mb-6">
            Get in touch
          </h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-md">
            Product, partnerships, or collaboration.
          </p>
          <ul className="flex flex-col gap-2">
            {[
              { href: "https://www.linkedin.com/in/pavelpolovinka/", label: "LinkedIn" },
              { href: "https://t.me/pavelpolovinka", label: "Telegram · @pavelpolovinka" },
              { href: "https://www.facebook.com/pavelpolovinka/", label: "Facebook" },
            ].map(({ href, label }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="game-menu-item block w-full px-4 py-3 text-left rounded border-2 border-game-border bg-game-panel hover:border-accent hover:bg-game-panel-hover transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="game-footer border-t border-game-border py-6">
        <div className="container max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="game-credits text-xs text-muted-foreground tracking-wider">
            polovinka.work · Pavel Polovinka
          </p>
        </div>
      </footer>
    </>
  );
}
