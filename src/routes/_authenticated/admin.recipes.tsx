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

export const Route = createFileRoute("/_authenticated/admin/recipes")({
  head: () => ({ meta: [{ title: "Recipes — Admin" }] }),
  component: RecipesAdminPage,
});

type Recipe = {
  id: string;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  body: string;
  image_url: string | null;
  published: boolean;
  sort_order: number;
};

const TAG_FILTERS = ["All", "Breakfast", "Post-workout", "Lunch", "Dinner", "Snack"] as const;
type TagFilter = (typeof TAG_FILTERS)[number];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ~100 years
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365 * 100;

async function uploadRecipeImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("recipe-images")
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage
    .from("recipe-images")
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (error || !data) throw error ?? new Error("Failed to create URL");
  return data.signedUrl;
}

function RecipesAdminPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TagFilter>("All");
  const [form, setForm] = useState({
    title: "",
    tag: "",
    excerpt: "",
    body: "",
    image_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRecipes((data as Recipe[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleNewImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadRecipeImage(file);
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
      const url = await uploadRecipeImage(file);
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
    const { error } = await supabase.from("recipes").insert({
      slug,
      title: form.title.trim(),
      tag: form.tag.trim(),
      excerpt: form.excerpt.trim(),
      body: form.body.trim(),
      image_url: form.image_url.trim() || null,
      sort_order: recipes.length,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Recipe added");
    setForm({ title: "", tag: "", excerpt: "", body: "", image_url: "" });
    load();
  };

  const update = async (id: string, patch: Partial<Recipe>) => {
    const { error } = await supabase.from("recipes").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = async (r: Recipe) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    const { error } = await supabase.from("recipes").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <h1 className="text-base font-semibold md:text-lg">Recipes</h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">← Orders</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-5 md:px-6 md:py-8">
        <form
          onSubmit={add}
          className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5"
        >
          <div>
            <h2 className="font-semibold">Add a recipe</h2>
            <p className="text-xs text-muted-foreground">
              Shows up on the landing page in the Recipes section.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <Label htmlFor="r-title">Title</Label>
              <Input
                id="r-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="High Protein Egg Recipes"
              />
            </div>
            <div>
              <Label htmlFor="r-tag">Tag</Label>
              <Input
                id="r-tag"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="Breakfast"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="r-body">Description</Label>
            <Textarea
              id="r-body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="10-minute power breakfasts that hit 30g+ of protein."
              rows={3}
            />
          </div>
          <div>
            <Label>Image</Label>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
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
            {submitting ? "Saving…" : "Add recipe"}
          </Button>
        </form>

        <div className="space-y-3">
          {recipes.map((r) => (
            <RecipeRow
              key={r.id}
              recipe={r}
              onUpdate={update}
              onRemove={remove}
              onReplaceImage={handleReplaceImage}
            />
          ))}
          {recipes.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No recipes yet. Add your first one above.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function RecipeRow({
  recipe: r,
  onUpdate,
  onRemove,
  onReplaceImage,
}: {
  recipe: Recipe;
  onUpdate: (id: string, patch: Partial<Recipe>) => Promise<unknown>;
  onRemove: (r: Recipe) => Promise<unknown>;
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
            <img
              src={r.image_url}
              alt={r.title}
              className="h-full w-full object-cover"
            />
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
            onBlur={(e) =>
              e.target.value !== r.title &&
              onUpdate(r.id, { title: e.target.value })
            }
          />
          <Input
            defaultValue={r.tag}
            placeholder="Tag"
            onBlur={(e) =>
              e.target.value !== r.tag &&
              onUpdate(r.id, { tag: e.target.value })
            }
          />
          <Textarea
            defaultValue={r.body}
            rows={2}
            onBlur={(e) =>
              e.target.value !== r.body &&
              onUpdate(r.id, { body: e.target.value })
            }
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
