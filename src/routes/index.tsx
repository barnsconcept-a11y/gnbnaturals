import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Egg,
  Dumbbell,
  Clock,
  Wallet,
  ChefHat,
  Repeat,
  ShoppingBag,
  CalendarCheck,
  MapPin,
  Instagram,
  MessageCircle,
  Mail,
  Sparkles,
  Flame,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero.jpg";
import productOpen from "@/assets/product-open.png";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "G&B Naturals — Natural Protein. Real Results." },
      {
        name: "description",
        content:
          "Fresh eggs reserved weekly through your local fitness community. Affordable daily protein, easier meal prep, consistent nutrition habits.",
      },
      { property: "og:title", content: "G&B Naturals — Natural Protein. Real Results." },
      {
        property: "og:description",
        content:
          "Modern protein convenience for fitness communities. Reserve weekly, pick up locally, stay consistent.",
      },
    ],
  }),
});

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={["font-brand leading-none tracking-tight", className].join(" ")} style={{ fontFamily: "var(--font-brand)" }}>
      G<span className="italic font-medium opacity-90">&amp;</span>B
    </span>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <BrandMark className="text-lg" />
        <Leaf className="absolute -top-1 right-0.5 h-3 w-3 -rotate-12 text-accent-foreground/80" fill="currentColor" />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-foreground">
          <BrandMark className="text-[17px] mr-0.5 text-primary" /> NATURALS
        </div>
        {!compact && (
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Natural Protein · Real Results
          </div>
        )}
      </div>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#product" className="hover:text-foreground transition-colors">Product</a>
          <a href="#stacks" className="hover:text-foreground transition-colors">Stacks</a>
          <a href="#why" className="hover:text-foreground transition-colors">Why eggs</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#recipes" className="hover:text-foreground transition-colors">Recipes</a>
        </nav>
        <Button asChild size="sm" className="rounded-full px-4">
          <a href="#stacks">Start now <ArrowRight className="h-4 w-4" /></a>
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 md:grid-cols-2 md:gap-10 md:pb-24 md:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
            <Leaf className="h-3 w-3 text-primary" />
            Natural Protein · Real Results
          </div>
          <h1 className="mt-5 text-balance text-5xl font-bold leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
            Affordable daily protein <span className="text-primary">made simple.</span>
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
            Fresh <BrandMark className="text-primary text-[1.05em]" /> Naturals eggs reserved weekly
            and ready for pickup through your local fitness community. Clean fuel for real training.
          </p>

          <ul className="mt-7 grid gap-2.5 text-sm">
            {[
              "Affordable daily protein",
              "Easier breakfast & meal prep",
              "Less dependence on expensive supplements",
              "Weekly pickup ready for you",
              "Built for consistent nutrition habits",
            ].map((b) => (
              <li key={b} className="flex items-center gap-3">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-foreground/90">{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-6 text-base shadow-elevated">
              <a href="#stacks">Start My Performance Stack <ArrowRight className="h-4 w-4" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-base">
              <a href="#stacks">See Protein Stacks</a>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-kraft-paper opacity-70 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
            <img
              src={heroImg}
              alt="Kraft paper egg packaging with healthy breakfast meal prep, water bottle and dumbbell"
              width={1536}
              height={1536}
              className="aspect-square w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-border bg-card p-4 shadow-elevated md:block">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">One habit. One month.</div>
                <div className="text-sm font-semibold">4 eggs a day, covered.</div>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -top-4 hidden rounded-2xl border border-border bg-card p-4 shadow-elevated md:block">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-kraft text-kraft-foreground">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">From</div>
                <div className="text-sm font-semibold">GHS 60 / crate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Packaging() {
  return (
    <section id="product" className="border-t border-border bg-cream/60">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">The Product</p>
          <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Clean packaging. Cleaner nutrition.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Designed in kraft and deep green — recyclable, stackable, and built for the way you train.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-border bg-primary text-primary-foreground shadow-elevated md:grid md:grid-cols-5">
          <div className="md:col-span-3">
            <img
              src={productOpen}
              alt="G&B Naturals open kraft carton with 30 fresh eggs — Good nutrition builds a stronger you"
              className="aspect-[16/10] w-full object-cover md:aspect-auto md:h-full"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col justify-center gap-4 p-8 md:col-span-2 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">Inside every pack</p>
            <h3 className="font-brand text-4xl leading-tight md:text-5xl" style={{ fontFamily: "var(--font-brand)" }}>
              Good nutrition builds a stronger you.
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground/85">
              <div className="flex items-center gap-2"><Egg className="h-4 w-4" /> High in Protein</div>
              <div className="flex items-center gap-2"><Leaf className="h-4 w-4" /> 100% Natural</div>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Fresh & Nutritious</div>
              <div className="flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Fuel Your Performance</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const problems = [
  { icon: Egg, title: "Eating enough protein", body: "Hitting daily targets is hard without a system." },
  { icon: Wallet, title: "Expensive supplements", body: "Powders and bars add up fast every month." },
  { icon: Clock, title: "Skipping breakfast", body: "Mornings are rushed — protein gets dropped first." },
  { icon: ChefHat, title: "Poor meal prep habits", body: "No plan means inconsistent fuel all week." },
  { icon: Repeat, title: "Convenience", body: "Without convenience, no habit ever sticks." },
];

function Problem() {
  return (
    <section className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">The real gap</p>
          <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Most people don&apos;t struggle with training.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">They struggle with everything around it.</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {problems.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 max-w-2xl text-balance text-xl font-medium text-foreground">
          G&amp;B Naturals helps make daily protein{" "}
          <span className="text-primary">easier, cheaper and more consistent.</span>
        </p>
      </div>
    </section>
  );
}

type Stack = {
  name: string;
  price: string;
  monthly: string;
  desc: string;
  features: string[];
  cta: string;
  featured?: boolean;
  highlight?: string;
};

const stacks: Stack[] = [
  {
    name: "The Daily Starter Stack™",
    price: "GHS 60",
    monthly: "4 Monthly Crates — GHS 230",
    desc: "Simple affordable protein for people getting started.",
    features: [
      "Small fresh eggs",
      "Weekly pickup access",
      "High-protein breakfast ideas",
      "Simple meal prep support",
      "Affordable daily protein",
    ],
    cta: "Start Here",
  },
  {
    name: "The 4-A-Day Performance Stack™",
    price: "GHS 70",
    monthly: "4 Monthly Crates — GHS 270",
    desc: "30 days of affordable daily protein without expensive supplements.",
    features: [
      "Medium-sized fresh eggs",
      "4 eggs daily for consistent protein intake",
      "Weekly protein supply reserved for you",
      "100 high-protein egg recipes",
      "Done-for-you meal prep ideas",
      "Easier breakfast planning",
      "Simple nutrition consistency",
      "Freshness guarantee",
    ],
    cta: "Start My Performance Stack",
    featured: true,
    highlight: "One simple habit. One month of protein covered.",
  },
  {
    name: "The Elite Jumbo Stack™",
    price: "GHS 80",
    monthly: "4 Monthly Crates — GHS 310",
    desc: "More protein. Bigger eggs. Bigger meals.",
    features: [
      "Jumbo fresh eggs",
      "Bigger servings and fuller meals",
      "Weekly protein supply reserved for you",
      "Premium meal prep content",
      "Priority reservation access",
      "Exclusive nutrition content",
    ],
    cta: "Go Elite",
  },
];

function StackCard({ s }: { s: Stack }) {
  const featured = !!s.featured;
  return (
    <div
      className={[
        "relative flex flex-col rounded-3xl border p-7 transition-all",
        featured
          ? "border-primary/20 bg-primary text-primary-foreground shadow-elevated lg:-my-6 lg:scale-[1.04]"
          : "border-border bg-card shadow-card hover:-translate-y-1 hover:shadow-elevated",
      ].join(" ")}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-kraft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-kraft-foreground shadow-soft">
            <Sparkles className="h-3 w-3" /> Most Popular
          </span>
        </div>
      )}

      <h3 className="text-xl font-bold tracking-tight">{s.name}</h3>
      <p className={["mt-1.5 text-sm", featured ? "text-primary-foreground/75" : "text-muted-foreground"].join(" ")}>
        {s.desc}
      </p>

      <div className="mt-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight">{s.price}</span>
          <span className={["text-sm", featured ? "text-primary-foreground/70" : "text-muted-foreground"].join(" ")}>
            / crate
          </span>
        </div>
        <div className={["mt-1 text-sm", featured ? "text-primary-foreground/75" : "text-muted-foreground"].join(" ")}>
          {s.monthly}
        </div>
      </div>

      <ul className="mt-6 space-y-3 text-sm">
        {s.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span
              className={[
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                featured ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary/10 text-primary",
              ].join(" ")}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className={featured ? "text-primary-foreground/95" : "text-foreground/90"}>{f}</span>
          </li>
        ))}
      </ul>

      {s.highlight && (
        <div className="mt-6 rounded-xl bg-primary-foreground/10 px-4 py-3 text-sm font-medium text-primary-foreground">
          {s.highlight}
        </div>
      )}

      <div className="mt-8 flex-1" />
      <Button
        size="lg"
        variant={featured ? "secondary" : "default"}
        className={[
          "h-12 rounded-full text-base",
          featured ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "",
        ].join(" ")}
      >
        {s.cta} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Stacks() {
  return (
    <section id="stacks" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Protein Stacks</p>
          <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Pick the stack that matches your habit.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Reserve weekly. Pick up locally. Stay consistent without overthinking.
          </p>
        </div>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3 lg:gap-8">
          {stacks.map((s) => (
            <StackCard key={s.name} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

const whyItems = [
  { icon: Egg, title: "Complete protein", body: "All essential amino acids in every egg." },
  { icon: Sparkles, title: "Rich in choline", body: "An everyday nutrient most diets fall short on." },
  { icon: Wallet, title: "Affordable protein", body: "One of the lowest cost-per-gram protein sources." },
  { icon: ChefHat, title: "Supports meal prep", body: "Cook once, eat across the week, stay consistent." },
  { icon: Leaf, title: "Nutrient dense", body: "Real food, simple ingredients, no powders required." },
];

function WhyEggs() {
  return (
    <section id="why" className="border-t border-border bg-cream/60">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid items-end gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Why eggs</p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
              The original performance food.
            </h2>
          </div>
          <p className="text-muted-foreground md:text-lg">
            Before powders, bars and shakes — there were eggs. Simple, affordable, and built for
            people who care about staying consistent.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {whyItems.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-kraft text-kraft-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  { icon: ShoppingBag, title: "Choose Your Protein Stack", body: "Starter, Performance or Elite — built for your routine." },
  { icon: CalendarCheck, title: "Reserve Weekly Supply", body: "We hold your eggs each week so you never run out." },
  { icon: MapPin, title: "Pick Up Through Your Fitness Community", body: "Grab them at your gym, hub or partner location." },
];

function HowItWorks() {
  return (
    <section id="how" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Three steps. One consistent habit.
          </h2>
        </div>

        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-3xl border border-border bg-card p-7 shadow-card">
              <div className="flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const recipes = [
  { tag: "Breakfast", title: "High Protein Egg Recipes", body: "10-minute power breakfasts that hit 30g+ of protein.", tone: "bg-primary text-primary-foreground" },
  { tag: "Prep", title: "Breakfast Meal Prep", body: "Sunday-night batch cooks that cover your whole week.", tone: "bg-kraft text-kraft-foreground" },
  { tag: "Budget", title: "Affordable Protein Meals", body: "Hit your macros without burning your monthly budget.", tone: "bg-accent text-accent-foreground" },
  { tag: "Performance", title: "Fitness Nutrition Tips", body: "Simple frameworks for staying consistent year-round.", tone: "bg-primary text-primary-foreground" },
];

function Recipes() {
  return (
    <section id="recipes" className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Content</p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Protein-focused nutrition content.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Recipes, meal prep guides and habit tools — built for the way you actually train.
            </p>
          </div>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            App coming soon
          </span>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recipes.map((r) => (
            <article
              key={r.title}
              className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className={`aspect-[4/3] ${r.tone} relative p-6`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(1_0_0/0.15),transparent_60%)]" />
                <span className="relative inline-flex rounded-full bg-background/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
                  {r.tag}
                </span>
                <Egg className="absolute bottom-4 right-4 h-20 w-20 opacity-20" />
              </div>
              <div className="p-5">
                <h3 className="text-base font-semibold">{r.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const testimonials = [
  { quote: "Meal prep became way easier. I just batch eggs every Sunday and I'm sorted for the week.", name: "Kojo A.", role: "Powerlifter" },
  { quote: "I stopped skipping breakfast. Having eggs reserved for me killed every excuse.", name: "Ama D.", role: "Crossfit athlete" },
  { quote: "Cheaper than protein supplements and I actually enjoy eating it. Game changer.", name: "Selorm K.", role: "Gym goer" },
];

function Testimonials() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Community</p>
          <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Built with fitness communities.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card"
            >
              <Dumbbell className="h-5 w-5 text-primary" />
              <blockquote className="mt-4 text-lg font-medium leading-snug text-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-kraft text-kraft-foreground text-sm font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-5 py-16 md:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-primary px-6 py-20 text-center text-primary-foreground shadow-elevated md:px-12 md:py-28">
        <div className="absolute inset-0 -z-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_20%,oklch(1_0_0)_1px,transparent_1.5px)] [background-size:24px_24px]" />
        <div className="relative">
          <h2 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
            Stop overthinking your protein.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-primary-foreground/80">
            Start building a simpler daily nutrition habit today.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-primary-foreground px-7 text-base text-primary hover:bg-primary-foreground/90"
            >
              <a href="#stacks">Start My Performance Stack <ArrowRight className="h-4 w-4" /></a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-primary-foreground/30 bg-transparent px-7 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <a href="#stacks">See Protein Stacks</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Affordable daily protein, made simple. Built for fitness communities and people who
              care about staying consistent.
            </p>
            <div className="mt-5 flex gap-2">
              <a
                href="#"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="WhatsApp"
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@gbnaturals.com"
                aria-label="Email"
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold">Contact</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>hello@gbnaturals.com</li>
              <li>+233 00 000 0000</li>
              <li>Accra, Ghana</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Legal</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Terms</a></li>
              <li><a href="#" className="hover:text-foreground">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} G&amp;B Naturals. All rights reserved.</span>
          <span>Affordable Daily Protein Made Simple.</span>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Packaging />
        <Stacks />
        <WhyEggs />
        <HowItWorks />
        <Recipes />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
