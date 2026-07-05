import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/authors")({
  head: () => ({ meta: [{ title: "Authors - Admin" }] }),
  component: AuthorsAdminPage,
});

type Author = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatar_url: string | null;
  website_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
};

const SOCIAL_FIELDS: { key: keyof Author; label: string; placeholder: string }[] = [
  { key: "website_url", label: "Website", placeholder: "https://example.com" },
  { key: "twitter_url", label: "Twitter / X", placeholder: "https://x.com/handle" },
  { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/handle" },
  { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/handle" },
  { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@handle" },
  { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/handle" },
  { key: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@handle" },
];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365 * 100;

async function uploadAvatar(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `authors/${crypto.randomUUID()}.${ext}`;
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

const emptyForm = {
  name: "",
  bio: "",
  avatar_url: "",
  website_url: "",
  twitter_url: "",
  instagram_url: "",
  facebook_url: "",
  youtube_url: "",
  linkedin_url: "",
  tiktok_url: "",
};

function AuthorsAdminPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("authors")
      .select("*")
      .order("name", { ascending: true });
    if (error) toast.error(error.message);
    setAuthors((data as Author[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleNewAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      setForm((f) => ({ ...f, avatar_url: url }));
      toast.success("Avatar uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const slugBase = slugify(form.name);
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    const payload: any = { slug, name: form.name.trim(), bio: form.bio.trim() };
    payload.avatar_url = form.avatar_url.trim() || null;
    for (const { key } of SOCIAL_FIELDS) {
      payload[key] = (form as any)[key]?.trim() || null;
    }
    const { error } = await (supabase as any).from("authors").insert(payload);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Author added");
    setForm({ ...emptyForm });
    load();
  };

  const update = async (id: string, patch: Partial<Author>) => {
    const { error } = await (supabase as any).from("authors").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setAuthors((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = async (a: Author) => {
    if (!confirm(`Delete "${a.name}"? Articles and recipes will lose their author.`)) return;
    const { error } = await (supabase as any).from("authors").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <h1 className="text-base font-semibold md:text-lg">Authors</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/articles">Articles</Link>
            </Button>
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
        <form
          onSubmit={add}
          className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5"
        >
          <div>
            <h2 className="font-semibold">Add an author</h2>
            <p className="text-xs text-muted-foreground">
              Authors can be selected when creating articles and recipes.
            </p>
          </div>
          <div>
            <Label htmlFor="au-name">Name</Label>
            <Input
              id="au-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="au-bio">Short bio</Label>
            <Textarea
              id="au-bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="A short bio shown next to their articles and recipes."
              rows={3}
            />
          </div>
          <div>
            <Label>Avatar</Label>
            <div className="flex items-center gap-3">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted" />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading…" : form.avatar_url ? "Replace" : "Upload avatar"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleNewAvatarUpload(f);
                }}
              />
            </div>
            <Input
              className="mt-2"
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="…or paste image URL"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={`au-${f.key}`}>{f.label}</Label>
                <Input
                  id={`au-${f.key}`}
                  value={(form as any)[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value } as any)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Saving…" : "Add author"}
          </Button>
        </form>

        <div className="space-y-3">
          {authors.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No authors yet. Add your first one above.
            </p>
          ) : (
            authors.map((a) => <AuthorRow key={a.id} author={a} onUpdate={update} onRemove={remove} />)
          )}
        </div>
      </main>
    </div>
  );
}

function AuthorRow({
  author: a,
  onUpdate,
  onRemove,
}: {
  author: Author;
  onUpdate: (id: string, patch: Partial<Author>) => Promise<unknown>;
  onRemove: (a: Author) => Promise<unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleReplaceAvatar = async (file: File) => {
    setBusy(true);
    try {
      const url = await uploadAvatar(file);
      await onUpdate(a.id, { avatar_url: url });
      toast.success("Avatar updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex gap-4">
        <button
          type="button"
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted"
          onClick={() => inputRef.current?.click()}
          title="Click to replace avatar"
        >
          {a.avatar_url ? (
            <img src={a.avatar_url} alt={a.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Upload className="h-5 w-5" />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs">…</div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleReplaceAvatar(f);
          }}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            defaultValue={a.name}
            onBlur={(e) => e.target.value !== a.name && onUpdate(a.id, { name: e.target.value })}
          />
          <Textarea
            defaultValue={a.bio}
            rows={2}
            placeholder="Short bio"
            onBlur={(e) => e.target.value !== a.bio && onUpdate(a.id, { bio: e.target.value })}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((f) => (
              <Input
                key={f.key}
                defaultValue={(a as any)[f.key] ?? ""}
                placeholder={f.label}
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== (a as any)[f.key]) onUpdate(a.id, { [f.key]: v } as any);
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemove(a)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
