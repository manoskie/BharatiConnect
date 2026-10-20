import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { actions, useAppState } from "@/lib/store";
import type { Language, ProofMode, Settings } from "@/lib/types";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "System Settings — BharatiConnect Admin" },
      {
        name: "description",
        content: "Minimum pages, proof mode, freezes, reminders and default language.",
      },
      { property: "og:title", content: "System Settings — BharatiConnect Admin" },
      {
        property: "og:description",
        content: "Tune the reading habit rules for your organization.",
      },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const { t } = useTranslation();
  const { settings } = useAppState();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  const updateDraft = (patch: Partial<Settings>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <AdminShell title={t("admin.settings")}>
      <div className="glass grid max-w-3xl gap-5 rounded-3xl p-6">
        <div className="space-y-1.5">
          <Label>{t("admin.minimumPages")}</Label>
          <Input
            type="number"
            className="h-11"
            min={1}
            step={1}
            value={draft.minimumPages}
            onChange={(e) => updateDraft({ minimumPages: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("admin.proofMode")}</Label>
          <Select
            value={draft.proofMode}
            onValueChange={(v) => updateDraft({ proofMode: v as ProofMode })}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">off</SelectItem>
              <SelectItem value="optional">optional</SelectItem>
              <SelectItem value="required">required</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("admin.freezes")}</Label>
          <Input
            type="number"
            className="h-11"
            min={0}
            step={1}
            value={draft.freezesPerWeek}
            onChange={(e) => updateDraft({ freezesPerWeek: Number(e.target.value) })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("profile.reminderTime")}</Label>
            <Input
              type="time"
              className="h-11"
              value={draft.reminderTime}
              onChange={(e) => updateDraft({ reminderTime: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.nudgeTime")}</Label>
            <Input
              type="time"
              className="h-11"
              value={draft.nudgeTime}
              onChange={(e) => updateDraft({ nudgeTime: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-3">
          <Label>
            {t("admin.spotCheck")}: {draft.spotCheckRate}%
          </Label>
          <Slider
            value={[draft.spotCheckRate]}
            max={100}
            step={5}
            onValueChange={([v]) => updateDraft({ spotCheckRate: v ?? 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("admin.defaultLanguage")}</Label>
          <Select
            value={draft.defaultLanguage}
            onValueChange={(v) => updateDraft({ defaultLanguage: v as Language })}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mr">मराठी</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={saving || !Number.isInteger(draft.minimumPages) || draft.minimumPages < 1 ||
            !Number.isInteger(draft.freezesPerWeek) || draft.freezesPerWeek < 0}
          onClick={async () => {
            setSaving(true);
            try {
              await actions.updateSettings(draft);
              toast.success("Settings saved.");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Unable to save settings.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving..." : t("common.save")}
        </Button>
      </div>
    </AdminShell>
  );
}
