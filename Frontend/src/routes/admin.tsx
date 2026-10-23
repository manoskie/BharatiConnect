import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAppState } from "@/lib/store";
import { LoaderCircle } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — BharatiConnect" },
      {
        name: "description",
        content: "Manage Akshar Bharati staff, reading analytics, content and settings.",
      },
      { property: "og:title", content: "Admin Portal — BharatiConnect" },
      {
        property: "og:description",
        content: "Staff, analytics, proof review and settings for BharatiConnect administrators.",
      },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminRoute>
      <Outlet />
    </AdminRoute>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { authReady, sessionUser, adminAuthed, adminUser } = useAppState();
  const { t } = useTranslation();
  const allowed =
    authReady &&
    !!sessionUser &&
    adminAuthed &&
    (adminUser?.role === "admin" || adminUser?.role === "owner");

  if (!authReady) {
    return (
      <div
        className="flex min-h-screen items-center justify-center gap-3 bg-background"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle className="size-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
      </div>
    );
  }

  if (!allowed) return <Navigate to="/reading" replace />;

  return <>{children}</>;
}
