import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const mustChange = Boolean(
      (data.user.user_metadata as any)?.must_change_password,
    );
    if (mustChange && location.pathname !== "/change-password") {
      throw redirect({ to: "/change-password" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
