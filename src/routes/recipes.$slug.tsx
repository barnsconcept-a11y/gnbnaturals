import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Recipe = {
  slug: string;
  tag: string;
  title: string;
  body: string;
  image_url: string | null;
};

export const Route = createFileRoute("/recipes/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Recipe — ${params.slug}` },
      { name: "description", content: "A protein-focused recipe from GNB Naturals." },
    ],
  }),
  component: RecipePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <h1 className="text-3xl font-bold">Recipe not found</h1>
      <Link to="/" className="mt-6 inline-block text-primary underline">
        Back to home
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <button
          className="mt-6 rounded-full bg-primary px-5 py-2 text-primary-foreground"
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          Try again
        </button>
      </div>
    );
  },
});

function RecipePage() {
  const { slug } = Route.useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("recipes")
        .select("slug, tag, title, body, image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (cancelled) return;
      setRecipe(data as Recipe | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center text-muted-foreground">
        Loading recipe…
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-3xl font-bold">Recipe not found</h1>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-5 py-12 md:py-16">
      <Link
        to="/"
        hash="recipes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All recipes
      </Link>

      {recipe.image_url && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-3xl border border-border">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full object-cover"
          />
          {recipe.tag && (
            <span className="absolute left-4 top-4 inline-flex rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
              {recipe.tag}
            </span>
          )}
        </div>
      )}

      <h1 className="mt-8 text-balance text-4xl font-bold tracking-tight md:text-5xl">
        {recipe.title}
      </h1>

      <div className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
        {recipe.body}
      </div>
    </article>
  );
}
