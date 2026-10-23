import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LogOut, Mail, Pencil, Phone, Users } from "lucide-react";
import { StaffShell } from "@/components/staff/StaffShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { actions, useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — BharatiConnect" },
      {
        name: "description",
        content: "Switch between Marathi and English, set your reminder time and read notifications.",
      },
      { property: "og:title", content: "Profile — BharatiConnect" },
      {
        property: "og:description",
        content: "Language, reminders, theme and notifications for your BharatiConnect account.",
      },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { t, i18n } = useTranslation();
  const { sessionUser, departments, staff, language, theme, notifications } = useAppState();
  const [editOpen, setEditOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const liveNotifications = notifications;
  const liveStaff = staff;
  const dept = departments.find((d) => d.id === sessionUser?.departmentId);

  useEffect(() => {
    setProfileForm({
      name: sessionUser?.name ?? "",
      phone: sessionUser?.phone ?? "",
    });
  }, [sessionUser?.name, sessionUser?.phone]);

  return (
    <StaffShell>
      <div className="space-y-5">
        <div className="glass flex items-center gap-4 rounded-3xl p-5">
          <span
            className="flex size-16 items-center justify-center rounded-2xl text-xl font-bold text-white"
            style={{ backgroundColor: sessionUser?.avatarColor ?? "#6366f1" }}
          >
            {sessionUser?.name ? sessionUser.name.slice(0, 1) : "S"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{sessionUser?.name ?? "Staff Member"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {t("profile.role")}: {sessionUser?.role} ·{" "}
              {i18n.language === "mr" ? dept?.nameMr : dept?.nameEn}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="ml-auto shrink-0"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
            {t("profile.editProfile")}
          </Button>
        </div>

        <div className="glass grid gap-3 rounded-3xl p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">{t("profile.email")}</Label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 size-4 text-muted-foreground" />
              <Input
                id="profile-email"
                className="pl-9"
                value={sessionUser?.email ?? ""}
                readOnly
                aria-readonly="true"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">{t("profile.phone")}</Label>
            <div className="relative">
              <Phone className="absolute top-3 left-3 size-4 text-muted-foreground" />
              <Input
                id="profile-phone"
                className="pl-9"
                value={sessionUser?.phone ?? ""}
                readOnly
                aria-readonly="true"
              />
            </div>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={(open) => !savingProfile && setEditOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("profile.editProfile")}</DialogTitle>
              <DialogDescription>{t("profile.editProfileDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-profile-name">{t("profile.name")}</Label>
                <Input
                  id="edit-profile-name"
                  value={profileForm.name}
                  maxLength={100}
                  onChange={(event) =>
                    setProfileForm((form) => ({ ...form, name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-profile-email">{t("profile.email")}</Label>
                <Input
                  id="edit-profile-email"
                  value={sessionUser?.email ?? ""}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-profile-phone">{t("profile.phone")}</Label>
                <Input
                  id="edit-profile-phone"
                  type="tel"
                  value={profileForm.phone}
                  maxLength={30}
                  onChange={(event) =>
                    setProfileForm((form) => ({ ...form, phone: event.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                disabled={savingProfile || !profileForm.name.trim()}
                onClick={async () => {
                  setSavingProfile(true);
                  try {
                    await actions.updateOwnProfile(profileForm);
                    setEditOpen(false);
                    toast.success(t("profile.profileUpdated"));
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : t("profile.profileUpdateFailed"),
                    );
                  } finally {
                    setSavingProfile(false);
                  }
                }}
              >
                {savingProfile ? t("common.loading") : t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="glass space-y-4 rounded-3xl p-5">
          <div className="space-y-2">
            <Label>{t("profile.languageSwitch")}</Label>
            <ToggleGroup
              type="single"
              value={language}
              variant="outline"
              onValueChange={(v) =>
                v &&
                void actions.setLanguage(v as "en" | "mr").catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Unable to save language preference."),
                )
              }
              className="w-full"
            >
              <ToggleGroupItem value="mr" className="flex-1 touch-target">
                मराठी
              </ToggleGroupItem>
              <ToggleGroupItem value="en" className="flex-1 touch-target">
                English
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder">{t("profile.reminderTime")}</Label>
            <Input
              id="reminder"
              type="time"
              className="h-12"
              value={sessionUser?.reminderTime ?? "07:30"}
              onChange={(e) =>
                void actions.setReminderTime(e.target.value).catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Unable to save reminder time."),
                )
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="theme">{t("profile.theme")}</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {t("profile.light")}
              <Switch
                id="theme"
                checked={theme === "dark"}
                onCheckedChange={(c) => actions.setTheme(c ? "dark" : "light")}
              />
              {t("profile.dark")}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">{t("profile.notificationList")}</p>
          {liveNotifications.map((n) => (
            <button
              key={n.id}
              onClick={() =>
                void actions.markNotificationRead(n.id).catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Unable to mark notification as read."),
                )
              }
              className={cn(
                "glass w-full rounded-2xl p-3 text-left",
                !n.read && "border-primary/40 bg-primary/5",
              )}
            >
              <p className="text-sm font-medium">
                {i18n.language === "mr" ? n.titleMr : n.titleEn}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{n.at}</p>
            </button>
          ))}
          {liveNotifications.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("common.none", "No notifications")}</p>
          )}
        </div>

        {/* Staff Directory (Staff-04) */}
        <div className="glass space-y-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Users className="size-4 text-primary" />
              <span>{t("profile.staffDirectory", "Staff Directory")}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {liveStaff.filter((s) => s.active).length} {t("profile.members", "members")}
            </span>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {liveStaff
              .filter((s) => s.active)
              .map((member) => {
                const memberDept = departments.find((d) => d.id === member.departmentId);
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-2xl bg-muted/30 p-2.5 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                        style={{ backgroundColor: member.avatarColor || "#6366f1" }}
                      >
                        {member.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{member.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {i18n.language === "mr" ? memberDept?.nameMr : memberDept?.nameEn}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          title={member.phone}
                          className="rounded-lg p-1 hover:bg-muted hover:text-primary"
                        >
                          <Phone className="size-3.5" />
                        </a>
                      )}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          title={member.email}
                          className="rounded-lg p-1 hover:bg-muted hover:text-primary"
                        >
                          <Mail className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <Button asChild variant="outline" className="h-12 w-full gap-2">
          <Link to="/login" onClick={() => actions.logout()}>
            <LogOut className="size-4" /> {t("auth.logout")}
          </Link>
        </Button>
      </div>
    </StaffShell>
  );
}
