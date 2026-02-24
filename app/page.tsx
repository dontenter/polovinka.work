import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <header className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-12 pb-16 min-h-[80vh]">
        <div className="container max-w-5xl mx-auto flex flex-col lg:flex-row lg:items-center lg:gap-12">
          <div className="shrink-0 mb-8 lg:mb-0">
            <Image
              src="/photo.png"
              alt="Pavel Polovinka"
              width={192}
              height={192}
              className="w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover ring-2 ring-border shadow-lg"
              priority
            />
          </div>
          <div>
            <p className="text-muted-foreground text-sm sm:text-base tracking-widest uppercase mb-4">
              Product & Business Development
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground max-w-4xl [text-wrap:balance]">
              Pavel Polovinka
            </h1>
            <p className="mt-6 text-xl sm:text-2xl text-muted-foreground font-light max-w-2xl [text-wrap:balance]">
              This is <span className="text-foreground font-medium">how I work</span> —{" "}
              <span className="text-foreground">polovinka.work</span>
            </p>
            <p className="mt-4 text-muted-foreground">
              Product Business Development @ Playgama · ex‑Yandex · Jakarta, Indonesia
            </p>
            <nav className="mt-12 flex flex-wrap gap-4">
              {["about", "experience", "skills", "projects", "contact"].map((id) => (
                <Link
                  key={id}
                  href={`#${id}`}
                  className="text-foreground underline underline-offset-4 decoration-muted-foreground hover:decoration-foreground transition"
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <section id="about" className="py-16 sm:py-24 border-t border-border">
          <h2 className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-6">
            About
          </h2>
          <p className="text-lg sm:text-xl text-foreground font-light leading-relaxed [text-wrap:balance]">
            Experienced product manager with a focus on business and a broad skillset. Launched and
            optimized internal and consumer-facing products in both startups and large corporations.
            Proven ability to lead cross-functional teams, drive growth, and deliver measurable
            results.
          </p>
          <p className="mt-6 text-muted-foreground leading-relaxed">
            Total experience: <strong className="text-foreground">13+ years</strong>. Graduated from
            ITMO University in Computer/Information Technology Administration and Management.
          </p>
        </section>

        <section id="experience" className="py-16 sm:py-24 border-t border-border">
          <h2 className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-10">
            Experience
          </h2>
          <ul className="space-y-12">
            {[
              {
                title: "Product Business Development",
                period: "May 2024 — Present",
                place: "Playgama · Computer games, product",
                desc: null,
              },
              {
                title: "CPO, COO",
                period: "Nov 2023 — May 2024",
                place: "iber · Real estate aggregator, Jakarta",
                desc: "Vision, roadmap, product and operations management (12 people), hiring, financial modeling, partnerships. Launched the website.",
              },
              {
                title: "Founder, CEO",
                period: "Sep 2022 — Aug 2023",
                place: "Kidspace Indonesia · Children's education, Jakarta",
                desc: "Launched from scratch: website, ~1,500 MAU, 400+ partner providers, 800+ social media followers.",
              },
              {
                title: "Head of Cargo Operations",
                period: "Oct 2021 — May 2022",
                place: "Yandex Delivery · Moscow",
                desc: "30% increase in order volume through redesign of driver app and client service; 50% reduction in driver delays; launched in 10 new cities.",
              },
              {
                title: "Head of Product",
                period: "Mar 2019 — Oct 2021",
                place: "Yandex Go (Yandex Taxi) · Moscow",
                desc: "Managed business with 200,000 DAU; tripled market share; launched in Kazakhstan and Belarus; 20% call center cost savings; 3x order growth in 1.5 years with positive EBITDA.",
              },
              {
                title: "Head of Products in QA Department",
                period: "Mar 2017 — Mar 2019",
                place: "MTS · Moscow",
                desc: "Launched internal products: automation from idea to operation, training chatbots, reporting, web analytics for autotests.",
              },
              {
                title: "Head of Automated Testing Department",
                period: "Dec 2011 — Mar 2017",
                place: "SITRONICS · Saint Petersburg",
                desc: "Grew from tester to department head (30 people); designed autotests and frameworks; 4,000+ UI and API tests.",
              },
            ].map((job) => (
              <li key={job.title + job.period}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xl font-medium text-foreground">{job.title}</h3>
                  <span className="text-muted-foreground text-sm">{job.period}</span>
                </div>
                <p className="text-muted-foreground mt-1">{job.place}</p>
                {job.desc && (
                  <p className="text-foreground/80 mt-2 text-sm">{job.desc}</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section id="skills" className="py-16 sm:py-24 border-t border-border">
          <h2 className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-8">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Product Management",
              "Business Development",
              "Strategy",
              "Sales & B2B",
              "Operations",
              "Goal Setting",
              "Hiring & Team Leadership",
              "Metrics & Analytics",
              "Partnerships",
              "Finance Modeling",
              "Cost Optimization",
              "Social Media",
            ].map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 bg-muted text-foreground rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section id="projects" className="py-16 sm:py-24 border-t border-border">
          <h2 className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-10">
            Key highlights
          </h2>
          <ul className="space-y-6">
            {[
              {
                name: "Yandex Taxi",
                text: "Managed business with 200,000 DAU; tripled market share; launched in Belarus and Kazakhstan.",
              },
              {
                name: "Yandex Cargo",
                text: "Redesigned driver app and client service → 30% increase in order volume.",
              },
              {
                name: "Kidspace",
                text: "Launched educational startup for children in the Indonesian market from scratch.",
              },
              {
                name: "Befront",
                text: "Developed product and sales strategy for B2B startup.",
              },
              {
                name: "MTS",
                text: "Co-inspired and executed product transformation.",
              },
            ].map(({ name, text }) => (
              <li key={name} className="pl-4 border-l-2 border-border">
                <strong className="text-foreground">{name}</strong> — {text}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <h3 className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-4">
              Certifications
            </h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>Product Management — GoPractice</li>
              <li>Digital Product Manager — Netology</li>
              <li>Product Thinking — ScrumTrek</li>
              <li>Virality in Products — Grow Horse</li>
            </ul>
          </div>
        </section>

        <section id="contact" className="py-16 sm:py-24 border-t border-border">
          <h2 className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-8">
            Contact
          </h2>
          <p className="text-foreground font-light mb-6 [text-wrap:balance]">
            Get in touch to discuss product, partnerships, or collaboration.
          </p>
          <ul className="flex flex-wrap gap-6">
            <li>
              <a
                href="https://www.linkedin.com/in/pavelpolovinka/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 decoration-muted-foreground hover:decoration-accent transition"
              >
                LinkedIn
              </a>
            </li>
            <li>
              <a
                href="https://t.me/pavelpolovinka"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 decoration-muted-foreground hover:decoration-accent transition"
              >
                Telegram · @pavelpolovinka
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/pavelpolovinka/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 decoration-muted-foreground hover:decoration-accent transition"
              >
                Facebook
              </a>
            </li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-medium">polovinka.work</span> — Pavel Polovinka ·
            Product & Business Development
          </p>
        </div>
      </footer>
    </>
  );
}
