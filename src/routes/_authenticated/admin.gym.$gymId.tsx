import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getGymDetail,
  updateGym,
  removeGymOwner,
  createGymUser,
} from "@/lib/admin-users.functions";
import { geocodeAddress, reverseGeocode } from "@/lib/geocode.functions";
import { MapPicker } from "@/components/MapPicker";
import { GymDiscountsSection } from "@/components/GymDiscountsSection";
import { LockableField } from "@/components/LockableField";
import {
  Trash2,
  UserPlus,
  ArrowLeft,
  Upload,
  MapPin,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/gym/$gymId")({
  head: () => ({ meta: [{ title: "Gym profile - Admin" }] }),
  component: GymDetailPage,
});

type Owner = {
  user_id: string;
  email: string;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type Stats = {
  total_sales: number;
  total_crates: number;
  total_orders: number;
  commission_earned: number;
  commission_paid: number;
  commission_outstanding: number;
};

const money = (n: number) =>
  `GH₵ ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function GymDetailPage() {
  const { gymId } = Route.useParams();
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getGymDetail);
  const saveGym = useServerFn(updateGym);
  const removeOwner = useServerFn(removeGymOwner);
  const createUser = useServerFn(createGymUser);
  const doGeocode = useServerFn(geocodeAddress);
  const doReverseGeocode = useServerFn(reverseGeocode);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [active, setActive] = useState(true);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [addingOwner, setAddingOwner] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lockSignal, setLockSignal] = useState(0);
  const [mapUnlocked, setMapUnlocked] = useState(false);

  const load = async () => {
    try {
      const res = await fetchDetail({ data: { gym_id: gymId } });
      const g = res.gym as any;
      setName(g.name);
      setRate(String(g.commission_per_crate ?? 0));
      setActive(!!g.active);
      setAddress(g.address ?? "");
      setLat(g.latitude ?? null);
      setLng(g.longitude ?? null);
      setImagePath(g.image_url ?? null);
      setImageUrl(res.image_signed_url ?? null);
      setOwners(res.owners);
      setStats(res.stats);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  const onUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${gymId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("gym-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      setImagePath(path);
      const { data: signed } = await supabase.storage
        .from("gym-images")
        .createSignedUrl(path, 60 * 60);
      setImageUrl(signed?.signedUrl ?? null);
      toast.success("Image uploaded — remember to save");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onGeocode = async () => {
    if (!address.trim()) return toast.error("Enter an address first");
    setGeocoding(true);
    try {
      const r = await doGeocode({ data: { address: address.trim() } });
      setLat(r.lat);
      setLng(r.lng);
      setAddress(r.formatted_address);
      toast.success("Location found — remember to save");
    } catch (e: any) {
      toast.error(e.message ?? "Geocode failed");
    } finally {
      setGeocoding(false);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveGym({
        data: {
          gym_id: gymId,
          name: name.trim(),
          commission_per_crate: Number(rate) || 0,
          active,
          address: address.trim() || null,
          latitude: lat,
          longitude: lng,
          image_url: imagePath,
        },
      });
      toast.success("Saved");
      setLockSignal((v) => v + 1);
      setMapUnlocked(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onRemoveOwner = async (o: Owner) => {
    if (!confirm(`Remove ${o.email} from this gym?`)) return;
    try {
      await removeOwner({ data: { gym_id: gymId, user_id: o.user_id } });
      toast.success("Owner removed");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const onAddOwner = async () => {
    if (!newEmail.trim()) return toast.error("Email required");
    setAddingOwner(true);
    try {
      await createUser({
        data: {
          email: newEmail.trim(),
          role: "gym_owner",
          gym_ids: [gymId],
        },
      });
      toast.success(`Invite sent to ${newEmail.trim()}`);
      setNewEmail("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setAddingOwner(false);
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <h1 className="text-base font-semibold md:text-lg">Gym profile</h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/gyms">
              <ArrowLeft className="mr-1 h-4 w-4" /> All gyms
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5 md:px-6 md:py-8">
        {/* Sales snapshot */}
        {stats && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total sales" value={money(stats.total_sales)} />
            <StatCard label="Crates sold" value={String(stats.total_crates)} />
            <StatCard
              label="Commission earned"
              value={money(stats.commission_earned)}
              sub={`Paid ${money(stats.commission_paid)}`}
            />
            <StatCard
              label="Outstanding"
              value={money(stats.commission_outstanding)}
              sub={`${stats.total_orders} orders`}
              highlight={stats.commission_outstanding > 0}
            />
          </section>
        )}

        <form
          onSubmit={onSave}
          className="space-y-5 rounded-xl border border-border bg-card p-4 md:p-5"
        >
          <h2 className="font-semibold">Gym info</h2>

          {/* Image */}
          <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-start">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Gym photo</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadImage(f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload"}
                </Button>
                {imageUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      setImagePath(null);
                      setImageUrl(null);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPG or PNG. Save the form to apply changes.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <LockableField>
              {(locked) => (
                <>
                  <Label htmlFor="g-name">Name</Label>
                  <Input
                    id="g-name"
                    value={name}
                    disabled={locked}
                    onChange={(e) => setName(e.target.value)}
                  />
                </>
              )}
            </LockableField>
            <LockableField>
              {(locked) => (
                <>
                  <Label htmlFor="g-rate">GH₵ / crate</Label>
                  <Input
                    id="g-rate"
                    type="number"
                    step="0.01"
                    disabled={locked}
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </>
              )}
            </LockableField>
          </div>

          {/* Address + Map */}
          <div className="space-y-2">
            <LockableField>
              {(locked) => (
                <>
                  <Label htmlFor="g-address">Address</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Textarea
                      id="g-address"
                      value={address}
                      disabled={locked}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      placeholder="e.g. 12 Ring Road, Accra"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onGeocode}
                      disabled={geocoding || locked}
                      className="sm:self-start"
                    >
                      <Search className="mr-1 h-4 w-4" />
                      {geocoding ? "Locating…" : "Find on map"}
                    </Button>
                  </div>
                </>
              )}
            </LockableField>
            <MapPicker
              lat={lat}
              lng={lng}
              onChange={async (la, ln) => {
                setLat(la);
                setLng(ln);
                try {
                  const r = await doReverseGeocode({
                    data: { lat: la, lng: ln },
                  });
                  if (r.formatted_address) setAddress(r.formatted_address);
                } catch {
                  /* silent – pin still saved */
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {lat != null && lng != null ? (
                <span>
                  Pin at {lat.toFixed(5)}, {lng.toFixed(5)}. Click map or drag
                  marker to adjust — address updates automatically. Press
                  “Save changes” to store it.
                </span>
              ) : (
                <span>
                  Click the map to drop a pin, or type an address and press
                  “Find on map”.
                </span>
              )}
            </div>
          </div>


          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant={active ? "outline" : "secondary"}
              onClick={() => setActive((a) => !a)}
            >
              {active ? "Active" : "Inactive"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Click to toggle. Save to apply.
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/admin/gyms" })}
            >
              Cancel
            </Button>
          </div>
        </form>

        <GymDiscountsSection gymId={gymId} />

        <section className="space-y-3 rounded-xl border border-border bg-card p-4 md:p-5">
          <div>
            <h2 className="font-semibold">Owner logins</h2>
            <p className="text-xs text-muted-foreground">
              Emails that can sign in to manage this gym.
            </p>
          </div>

          {owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No owner logins yet.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {owners.map((o) => (
                <li
                  key={o.user_id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.last_sign_in_at
                        ? `Last sign-in ${new Date(o.last_sign_in_at).toLocaleDateString()}`
                        : "Never signed in"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onRemoveOwner(o)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 sm:grid-cols-[1fr_auto]">
            <Input
              type="email"
              placeholder="owner@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="off"
            />
            <Button size="sm" disabled={addingOwner} onClick={onAddOwner}>
              <UserPlus className="mr-1 h-4 w-4" />
              {addingOwner ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
