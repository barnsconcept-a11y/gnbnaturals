import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/stack")({
  beforeLoad: () => {
    throw redirect({ to: "/order", replace: true });
  },
});
