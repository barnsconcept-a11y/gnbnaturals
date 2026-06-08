import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Article = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  body: string;
  image_url: string | null;
};

export const Route = createFileRoute("/articles/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Article — ${params.slug}` },
      { name: "description", content: "Protein & fitness insights from G&B Naturals." },
    ],
  }),
  component: ArticlePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <h1 className="text-3xl font-bold">Article not found</h1>
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

function ArticlePage() {
  const { slug } = Route.useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("articles")
        .select("slug, category, title, excerpt, body, image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (cancelled) return;
      setArticle(data as Article | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center text-muted-foreground">
        Loading article…
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-3xl font-bold">Article not found</h1>
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
        hash="articles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All articles
      </Link>

      {article.image_url && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-3xl border border-border">
          <img
            src={article.image_url}
            alt={article.title}
            className="h-full w-full object-cover"
          />
          {article.category && (
            <span className="absolute left-4 top-4 inline-flex rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
              {article.category}
            </span>
          )}
        </div>
      )}

      <h1 className="mt-8 text-balance text-4xl font-bold tracking-tight md:text-5xl">
        {article.title}
      </h1>

      {article.excerpt && (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{article.excerpt}</p>
      )}

      <div className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
        {article.body}
      </div>
    </article>
  );
}
