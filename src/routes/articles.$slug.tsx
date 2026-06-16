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
  created_at?: string | null;
};

export const Route = createFileRoute("/articles/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Article - ${params.slug}` },
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
      <div className="article-longform mx-auto max-w-[760px] px-5 py-24 text-center">
        Loading article…
      </div>
    );
  }

  if (!article) {
    return (
      <div className="article-longform mx-auto max-w-[760px] px-5 py-24 text-center">
        <h1 className="text-3xl font-bold">Article not found</h1>
        <Link to="/" className="mt-6 inline-block underline">
          Back to home
        </Link>
      </div>
    );
  }

  // Split body into paragraphs; support markdown-ish blockquotes (lines starting with ">")
  // and H2 (## ) / H3 (### ) headings for elegant hierarchy.
  const blocks = article.body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  return (
    <article className="article-longform mx-auto max-w-[760px] px-5 py-14 md:py-20">
      <Link
        to="/"
        hash="articles"
        className="article-back inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> All articles
      </Link>

      {article.category && (
        <div className="article-eyebrow mt-10">{article.category}</div>
      )}

      <h1 className="article-title mt-3">{article.title}</h1>

      {article.excerpt && (
        <p className="article-deck mt-5">{article.excerpt}</p>
      )}

      <div className="article-rule mt-8" />

      {article.image_url && (
        <figure className="my-10">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full rounded-sm"
          />
        </figure>
      )}

      <div className="article-body mt-8">
        {blocks.map((block, i) => {
          if (block.startsWith("### ")) {
            return <h3 key={i}>{block.slice(4)}</h3>;
          }
          if (block.startsWith("## ")) {
            return <h2 key={i}>{block.slice(3)}</h2>;
          }
          if (block.startsWith("> ")) {
            const quote = block
              .split("\n")
              .map((l) => l.replace(/^>\s?/, ""))
              .join(" ");
            return <blockquote key={i}>{quote}</blockquote>;
          }
          return <p key={i}>{block}</p>;
        })}
      </div>

      <div className="article-endmark mt-16">■</div>
    </article>
  );
}
