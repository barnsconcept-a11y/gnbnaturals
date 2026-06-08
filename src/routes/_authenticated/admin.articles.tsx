import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/articles")({
  head: () => ({ meta: [{ title: "Articles - Admin" }] }),
  component: ArticlesAdminPage,
});

type Article = {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  body: string;
  image_url: string | null;
  published: boolean;
  sort_order: number;
};

const CATEGORY_FILTERS = ["All", "Nutrition", "Training", "Recovery", "Habits", "Mindset"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365 * 100;

async function uploadArticleImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("article-images")
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage
    .from("article-images")
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (error || !data) throw error ?? new Error("Failed to create URL");
  return data.signedUrl;
}

function ArticlesAdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>("All");
  const [form, setForm] = useState({
    title: "",
    category: "",
    excerpt: "",
    body: "",
    image_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("articles")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setArticles((data as Article[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleNewImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadArticleImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReplaceImage = async (id: string, file: File) => {
    try {
      const url = await uploadArticleImage(file);
      await update(id, { image_url: url });
      toast.success("Image updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    const slugBase = slugify(form.title);
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await (supabase as any).from("articles").insert({
      slug,
      title: form.title.trim(),
      category: form.category.trim(),
      excerpt: form.excerpt.trim(),
      body: form.body.trim(),
      image_url: form.image_url.trim() || null,
      sort_order: articles.length,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Article added");
    setForm({ title: "", category: "", excerpt: "", body: "", image_url: "" });
    load();
  };

  const update = async (id: string, patch: Partial<Article>) => {
    const { error } = await (supabase as any).from("articles").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setArticles((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = async (r: Article) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    const { error } = await (supabase as any).from("articles").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <h1 className="text-base font-semibold md:text-lg">Articles</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/recipes">Recipes</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">← Orders</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-5 md:px-6 md:py-8">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((t) => {
            const active = filter === t;
            const count =
              t === "All"
                ? articles.length
                : articles.filter((r) => r.category.toLowerCase() === t.toLowerCase()).length;
            return (
              <button
                key={`top-${t}`}
                type="button"
                onClick={() => setFilter(t)}
                className={[
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40",
                ].join(" ")}
              >
                {t} <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={add}
          className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5"
        >
          <div>
            <h2 className="font-semibold">Add an article</h2>
            <p className="text-xs text-muted-foreground">
              General content on protein, training, recovery and habits - shown on the landing page.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <Label htmlFor="a-title">Title</Label>
              <Input
                id="a-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Why protein matters for everyday fitness"
              />
            </div>
            <div>
              <Label htmlFor="a-cat">Category</Label>
              <Input
                id="a-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Nutrition"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="a-excerpt">Short highlight</Label>
            <Textarea
              id="a-excerpt"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="One-sentence teaser shown on the article card."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="a-body">Full article</Label>
            <Textarea
              id="a-body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="The full article body - shown on the article page."
              rows={8}
            />
          </div>
          <div>
            <Label>Image</Label>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted" />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading…" : form.image_url ? "Replace" : "Upload image"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleNewImageUpload(f);
                }}
              />
            </div>
            <Input
              className="mt-2"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="…or paste image URL"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Saving…" : "Add article"}
          </Button>
        </form>

        <div className="space-y-3">
          {(() => {
            const visible =
              filter === "All"
                ? articles
                : articles.filter((r) => r.category.toLowerCase() === filter.toLowerCase());
            if (visible.length === 0) {
              return (
                <p className="text-center text-sm text-muted-foreground">
                  {articles.length === 0
                    ? "No articles yet. Add your first one above."
                    : `No articles in "${filter}".`}
                </p>
              );
            }
            return visible.map((r) => (
              <ArticleRow
                key={r.id}
                article={r}
                onUpdate={update}
                onRemove={remove}
                onReplaceImage={handleReplaceImage}
              />
            ));
          })()}
        </div>
      </main>
    </div>
  );
}

function ArticleRow({
  article: r,
  onUpdate,
  onRemove,
  onReplaceImage,
}: {
  article: Article;
  onUpdate: (id: string, patch: Partial<Article>) => Promise<unknown>;
  onRemove: (r: Article) => Promise<unknown>;
  onReplaceImage: (id: string, file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex gap-4">
        <button
          type="button"
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted"
          onClick={() => inputRef.current?.click()}
          title="Click to replace image"
        >
          {r.image_url ? (
            <img src={r.image_url} alt={r.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Upload className="h-5 w-5" />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs">
              …
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            await onReplaceImage(r.id, f);
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            defaultValue={r.title}
            onBlur={(e) => e.target.value !== r.title && onUpdate(r.id, { title: e.target.value })}
          />
          <Input
            defaultValue={r.category}
            placeholder="Category (Nutrition, Training, Recovery, Habits, Mindset)"
            onBlur={(e) =>
              e.target.value !== r.category && onUpdate(r.id, { category: e.target.value })
            }
          />
          <Textarea
            defaultValue={r.excerpt}
            rows={2}
            placeholder="Short highlight (shown on the card)"
            onBlur={(e) =>
              e.target.value !== r.excerpt && onUpdate(r.id, { excerpt: e.target.value })
            }
          />
          <Textarea
            defaultValue={r.body}
            rows={5}
            placeholder="Full article"
            onBlur={(e) => e.target.value !== r.body && onUpdate(r.id, { body: e.target.value })}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={r.published}
                onCheckedChange={(v) => onUpdate(r.id, { published: v })}
              />
              <span className="text-xs text-muted-foreground">
                {r.published ? "Published" : "Draft"}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemove(r)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
