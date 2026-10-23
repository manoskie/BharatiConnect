import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fsGetStaffReadingLogs } from "@/lib/firebase-service";
import { actions, calculateCurrentStreak, useAppState } from "@/lib/store";
import type { User } from "@/lib/types";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff Management — BharatiConnect Admin" },
      { name: "description", content: "Invite, review and deactivate Akshar Bharati staff." },
      { property: "og:title", content: "Staff Management — BharatiConnect Admin" },
      { property: "og:description", content: "Manage staff accounts and invitations." },
    ],
  }),
  component: StaffAdmin,
});

function StaffAdmin() {
  const { t, i18n } = useTranslation();
  const { staff, departments, logs, sessionUser, adminUser } = useAppState();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [detail, setDetail] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", departmentId: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [removingStaff, setRemovingStaff] = useState(false);
  const [invite, setInvite] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", departmentId: "" });
  const [computedStreaks, setComputedStreaks] = useState<Record<string, number>>({});
  const staffIds = staff.map((member) => member.id).sort().join("|");

  useEffect(() => {
    const userIds = staffIds ? staffIds.split("|") : [];
    let cancelled = false;

    if (userIds.length === 0) {
      setComputedStreaks({});
      return;
    }

    void Promise.all(
      userIds.map(async (userId) => {
        try {
          const userLogs = await fsGetStaffReadingLogs(userId);
          return [userId, calculateCurrentStreak(userLogs)] as const;
        } catch (error) {
          console.error(`Unable to calculate streak from logs for staff account ${userId}:`, error);
          return [userId, null] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const successful = results.filter(
        (result): result is readonly [string, number] => result[1] !== null,
      );
      setComputedStreaks(Object.fromEntries(successful));
      if (successful.length !== results.length) {
        toast.error("Some staff streaks could not be calculated from reading history.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [staffIds]);

  const rows = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(q.toLowerCase()) &&
      (dept === "all" || s.departmentId === dept) &&
      (status === "all" || (status === "active" ? s.active : !s.active)),
  );
  const deptName = (id: string) => {
    const d = departments.find((x) => x.id === id);
    return i18n.language === "mr" ? d?.nameMr : d?.nameEn;
  };

  return (
    <AdminShell title={t("admin.staff")}>
      <div className="glass space-y-4 rounded-3xl p-5">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              placeholder={t("common.search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="h-10 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {i18n.language === "mr" ? d.nameMr : d.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-10 gap-2">
                <UserPlus className="size-4" /> {t("admin.addStaff")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("admin.addStaff")}</DialogTitle>
                <DialogDescription>{t("admin.inviteLink")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {(
                  [
                    ["name", t("reading.title")],
                    ["email", t("auth.emailOrPhone")],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="space-y-1.5">
                    <Label>{field === "name" ? "Name" : label}</Label>
                    <Input
                      type={field === "email" ? "email" : "text"}
                      className="h-11"
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label htmlFor="add-staff-phone">{t("profile.phone")}</Label>
                  <Input
                    id="add-staff-phone"
                    type="tel"
                    className="h-11"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("profile.departmentLabel")}</Label>
                  <Select
                    value={form.departmentId}
                    onValueChange={(v) => setForm({ ...form, departmentId: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t("profile.departmentLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {i18n.language === "mr" ? d.nameMr : d.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="h-11 w-full"
                  disabled={!form.name.trim() || !form.email.trim() || !form.departmentId || inviting}
                  onClick={async () => {
                    setInviting(true);
                    setInvite(null);
                    try {
                      const user = await actions.addStaff(form);
                      setInvite(user.email);
                      setForm({ name: "", email: "", phone: "", departmentId: "" });
                      toast.success(`Password setup email sent to ${user.email}`);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Unable to invite this staff member.");
                    } finally {
                      setInviting(false);
                    }
                  }}
                >
                  {inviting ? "Sending..." : t("common.add")}
                </Button>
                {invite && (
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs font-medium">Password setup email sent to {invite}.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>{t("profile.departmentLabel")}</TableHead>
                <TableHead>{t("profile.role")}</TableHead>
                <TableHead className="text-right">🔥</TableHead>
                <TableHead className="text-right">{t("common.points")}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetail(s)}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{deptName(s.departmentId)}</TableCell>
                  <TableCell className="capitalize">{s.role}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(s.currentStreak ?? s.streak ?? s.streakCount ?? 0) > 0
                      ? (s.currentStreak ?? s.streak ?? s.streakCount ?? 0)
                      : (computedStreaks[s.id] ??
                        calculateCurrentStreak(logs.filter((log) => log.userId === s.id)))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.points}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        s.active ? "bg-success/20 text-success-foreground" : "bg-muted"
                      }`}
                    >
                      {s.active ? "active" : "inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(s.role === "staff" ||
                      (s.role === "admin" && adminUser?.role === "owner")) &&
                      s.id !== sessionUser?.id && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {adminUser?.role === "owner" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingRoleFor === s.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              const nextRole = s.role === "staff" ? "admin" : "staff";
                              setUpdatingRoleFor(s.id);
                              void actions
                                .setStaffRole(s.id, nextRole)
                                .then(() => {
                                  toast.success(
                                    nextRole === "admin"
                                      ? `${s.name} is now an admin.`
                                      : `${s.name}'s admin access was revoked.`,
                                  );
                                })
                                .catch((error: unknown) => {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to update administrator access.",
                                  );
                                })
                                .finally(() => setUpdatingRoleFor(null));
                            }}
                          >
                            {updatingRoleFor === s.id
                              ? t("common.loading")
                              : s.role === "staff"
                                ? "Make Admin"
                                : "Revoke Admin"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditUser(s);
                            setEditForm({
                              name: s.name,
                              phone: s.phone,
                              departmentId: s.departmentId,
                            });
                          }}
                        >
                          <Pencil className="size-3.5" />
                          {t("admin.editStaffProfile")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (s.active) setRemoveTarget(s);
                            else {
                              void actions.toggleStaffActive(s.id).catch((error: unknown) => {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to update this account.",
                                );
                              });
                            }
                          }}
                        >
                          {s.active ? t("admin.removeStaff") : t("admin.reactivate")}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>
                  {detail.email} · {deptName(detail.departmentId)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold">{t("admin.readingHistory")}</p>
                  <div className="mt-2 space-y-2">
                    {logs
                      .filter((l) => l.userId === detail.id)
                      .slice(0, 8)
                      .map((l) => (
                        <div key={l.id} className="rounded-xl border border-border p-2 text-xs">
                          <p className="font-medium">{l.bookTitle}</p>
                          <p className="text-muted-foreground">
                            {l.date} · {l.pages} {t("common.pages")}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold">{t("admin.pointsLedger")}</p>
                  <div className="mt-2 space-y-2">
                    {logs
                      .filter((l) => l.userId === detail.id)
                      .slice(0, 8)
                      .map((l) => (
                        <div
                          key={l.id}
                          className="flex justify-between rounded-xl border border-border p-2 text-xs"
                        >
                          <span>{l.date}</span>
                          <span className="font-semibold">+{10 + l.pages}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removingStaff) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.removeStaffTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.removeStaffConfirmation", { name: removeTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingStaff}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removingStaff}
              onClick={(event) => {
                event.preventDefault();
                if (!removeTarget) return;
                setRemovingStaff(true);
                void actions
                  .toggleStaffActive(removeTarget.id)
                  .then(() => {
                    toast.success(t("admin.staffRemoved"));
                    setRemoveTarget(null);
                  })
                  .catch((error: unknown) => {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : t("admin.staffRemoveFailed"),
                    );
                  })
                  .finally(() => setRemovingStaff(false));
              }}
            >
              {removingStaff ? t("common.loading") : t("admin.removeStaff")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open && !savingEdit) setEditUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editStaffProfile")}</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-staff-name">{t("profile.name")}</Label>
                <Input
                  id="edit-staff-name"
                  value={editForm.name}
                  maxLength={100}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-staff-email">{t("profile.email")}</Label>
                <Input
                  id="edit-staff-email"
                  value={editUser.email}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-staff-phone">{t("profile.phone")}</Label>
                <Input
                  id="edit-staff-phone"
                  type="tel"
                  value={editForm.phone}
                  maxLength={30}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-staff-department">{t("profile.departmentLabel")}</Label>
                <Select
                  value={editForm.departmentId}
                  onValueChange={(departmentId) =>
                    setEditForm((current) => ({ ...current, departmentId }))
                  }
                >
                  <SelectTrigger id="edit-staff-department">
                    <SelectValue placeholder={t("profile.departmentLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {i18n.language === "mr" ? department.nameMr : department.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              disabled={
                savingEdit ||
                !editForm.name.trim() ||
                !editForm.departmentId ||
                !editUser
              }
              onClick={async () => {
                if (!editUser) return;
                setSavingEdit(true);
                try {
                  await actions.updateStaffProfile(editUser.id, editForm);
                  setDetail((current) =>
                    current?.id === editUser.id
                      ? {
                          ...current,
                          name: editForm.name.trim(),
                          phone: editForm.phone.trim(),
                          departmentId: editForm.departmentId,
                        }
                      : current,
                  );
                  setEditUser(null);
                  toast.success(t("profile.profileUpdated"));
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : t("profile.profileUpdateFailed"),
                  );
                } finally {
                  setSavingEdit(false);
                }
              }}
            >
              {savingEdit ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
