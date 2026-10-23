import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fsResetUserPoints,
  fsSubscribeAdminStaff,
  type AdminStaffMember,
} from "@/lib/firebase-service";
import { useAppState } from "@/lib/store";

export function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { adminAuthed, adminUser, departments } = useAppState();
  const isAdmin =
    adminAuthed && (adminUser?.role === "admin" || adminUser?.role === "owner");
  const [staff, setStaff] = useState<AdminStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<AdminStaffMember | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    return fsSubscribeAdminStaff(
      (members) => {
        setStaff(members);
        setLoading(false);
        setLoadError(false);
      },
      (error) => {
        console.error("Admin staff subscription failed:", error);
        setLoading(false);
        setLoadError(true);
      },
    );
  }, [isAdmin]);

  const departmentName = (departmentId: string) => {
    const department = departments.find((item) => item.id === departmentId);
    return department
      ? i18n.language === "mr"
        ? department.nameMr
        : department.nameEn
      : "—";
  };

  const resetPoints = async () => {
    if (!selectedStaff) return;
    setResettingId(selectedStaff.id);
    try {
      await fsResetUserPoints(selectedStaff.id);
      setStaff((members) =>
        members.map((member) =>
          member.id === selectedStaff.id ? { ...member, points: 0 } : member,
        ),
      );
      toast.success(t("admin.pointsResetSuccess", { name: selectedStaff.name }));
      setSelectedStaff(null);
    } catch (error) {
      console.error("Unable to reset staff points:", error);
      toast.error(error instanceof Error ? error.message : t("admin.pointsResetFailed"));
    } finally {
      setResettingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
        {t("admin.accessDenied")}
      </p>
    );
  }

  return (
    <section className="glass space-y-4 rounded-3xl p-5">
      <div>
        <h2 className="text-lg font-semibold">{t("admin.pointsDashboard")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin.pointsDashboardDescription")}</p>
      </div>

      {loading ? (
        <p className="py-3 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : loadError ? (
        <p role="alert" className="py-3 text-sm text-destructive">
          {t("admin.staffLoadFailed")}
        </p>
      ) : staff.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">{t("admin.noStaff")}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.staffName")}</TableHead>
                <TableHead>{t("profile.departmentLabel")}</TableHead>
                <TableHead className="text-right">{t("admin.currentPoints")}</TableHead>
                <TableHead className="text-right">{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name || "—"}</TableCell>
                  <TableCell>{departmentName(member.departmentId)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {member.points.toLocaleString(i18n.language === "mr" ? "mr-IN" : "en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={member.points === 0 || resettingId !== null}
                      onClick={() => setSelectedStaff(member)}
                    >
                      <RotateCcw className="mr-1.5 size-3.5" />
                      {t("admin.resetPointsButton")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={selectedStaff !== null}
        onOpenChange={(open) => {
          if (!open && resettingId === null) setSelectedStaff(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.confirmPointsResetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.confirmPointsReset", { name: selectedStaff?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingId !== null}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={resettingId !== null}
              onClick={(event) => {
                event.preventDefault();
                void resetPoints();
              }}
            >
              {resettingId === selectedStaff?.id
                ? t("common.loading")
                : t("admin.resetPointsButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
