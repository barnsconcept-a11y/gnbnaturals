import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";

const CreateUserInput = z.object({
  email: z.string().email().max(255),
  role: z.enum(["admin", "gym_owner"]),
  gym_ids: z.array(z.string().uuid()).max(50).default([]),
});

export const createGymUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateUserInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId } = context;

    // Verify caller is admin
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      throw new Error("Only admins can create users");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Build the redirect URL the invite link will land on
    const origin =
      getRequestHeader("origin") ||
      (() => {
        const host = getRequestHeader("host");
        const proto = getRequestHeader("x-forwarded-proto") || "https";
        return host ? `${proto}://${host}` : "";
      })();
    const redirectTo = origin
      ? `${origin}/change-password`
      : undefined;

    const { data: invited, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: { must_change_password: true },
        redirectTo,
      });
    if (inviteErr || !invited.user) {
      throw new Error(inviteErr?.message ?? "Failed to invite user");
    }

    const newUserId = invited.user.id;

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (roleErr) throw new Error(roleErr.message);

    if (data.role === "gym_owner" && data.gym_ids.length > 0) {
      const rows = data.gym_ids.map((gym_id) => ({
        user_id: newUserId,
        gym_id,
      }));
      const { error: gymErr } = await supabaseAdmin
        .from("gym_owners")
        .insert(rows);
      if (gymErr) throw new Error(gymErr.message);
    }

    return {
      ok: true,
      user_id: newUserId,
      email: data.email,
      invited: true,
    };
  });

export const clearMustChangePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { must_change_password: false },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listGymUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: userClient, userId } = context;
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      throw new Error("Only admins can list users");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 200,
    });
    if (error) throw new Error(error.message);

    const userIds = users.users.map((u) => u.id);
    const [{ data: ur }, { data: gow }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", userIds),
      supabaseAdmin
        .from("gym_owners")
        .select("user_id, gym_id, gyms(name)")
        .in("user_id", userIds),
    ]);

    return users.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      roles: (ur ?? []).filter((r) => r.user_id === u.id).map((r) => r.role),
      gyms: (gow ?? [])
        .filter((g) => g.user_id === u.id)
        .map((g: any) => g.gyms?.name)
        .filter(Boolean) as string[],
    }));
  });

export const deleteGymUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId } = context;
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      throw new Error("Only admins can delete users");
    }
    if (data.user_id === userId) {
      throw new Error("You can't delete your own account");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(userClient: any, userId: string) {
  const { data: roles } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (!roles || roles.length === 0) throw new Error("Admins only");
}

export const getGymDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ gym_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: gym, error: gymErr } = await supabaseAdmin
      .from("gyms")
      .select("*")
      .eq("id", data.gym_id)
      .single();
    if (gymErr) throw new Error(gymErr.message);

    const { data: links, error: linkErr } = await supabaseAdmin
      .from("gym_owners")
      .select("user_id")
      .eq("gym_id", data.gym_id);
    if (linkErr) throw new Error(linkErr.message);

    const owners = await Promise.all(
      (links ?? []).map(async (l: { user_id: string }) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(l.user_id);
        return {
          user_id: l.user_id,
          email: u?.user?.email ?? "",
          created_at: u?.user?.created_at ?? null,
          last_sign_in_at: u?.user?.last_sign_in_at ?? null,
        };
      }),
    );

    return { gym, owners };
  });

export const updateGym = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        gym_id: z.string().uuid(),
        name: z.string().min(1).max(200),
        commission_per_crate: z.number().min(0),
        active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("gyms")
      .update({
        name: data.name,
        commission_per_crate: data.commission_per_crate,
        active: data.active,
      })
      .eq("id", data.gym_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeGymOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ gym_id: z.string().uuid(), user_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("gym_owners")
      .delete()
      .eq("gym_id", data.gym_id)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
