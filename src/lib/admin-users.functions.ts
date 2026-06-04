import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateUserInput = z.object({
  email: z.string().email().max(255),
  role: z.enum(["admin", "gym_owner"]),
  gym_ids: z.array(z.string().uuid()).max(50).default([]),
});

function generateTempPassword(): string {
  // 14 chars, mixed case + digits + symbol — easy to share, strong enough
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 10; i++) pwd += pick(all);
  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

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

    const tempPassword = generateTempPassword();

    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create user");
    }

    const newUserId = created.user.id;

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
      temp_password: tempPassword,
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
