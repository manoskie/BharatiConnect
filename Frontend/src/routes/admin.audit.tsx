import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminShell } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/lib/store";
import type { AuditEntry } from "@/lib/types";

function getAuditChange(entry: AuditEntry): string {
  if (entry.change?.trim()) return entry.change;

  if (entry.before || entry.after) {
    return `${entry.before || "none"} → ${entry.after || "none"}`;
  }

  const target = entry.target.trim() || "item";
  const quotedTarget = `"${target}"`;
  const summaries: Record<string, string> = {
    "department.create": `Created ${quotedTarget}`,
    "department.delete": `Deleted ${quotedTarget}`,
    "calendar.holiday": `Added ${quotedTarget} holiday`,
    "calendar.leave": `Added leave for ${quotedTarget}`,
    "calendar.delete": `Removed calendar entry ${quotedTarget}`,
    "suggestion.approved": `Approved suggestion ${quotedTarget}`,
    "suggestion.rejected": `Rejected suggestion ${quotedTarget}`,
    "notice.publish": `Published notice ${quotedTarget}`,
    "post.publish": `Published post ${quotedTarget}`,
    "video.create": `Created video ${quotedTarget}`,
    "challenge.create": `Created challenge ${quotedTarget}`,
    "admin.create": `Created admin account for ${quotedTarget}`,
    "staff.invite": `Invited ${quotedTarget}`,
    "profile.update": `Updated profile for ${quotedTarget}`,
  };
  const summary = summaries[entry.action];
  if (summary) return summary;

  const action = entry.action.replace(/[._]/g, " ");
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}: ${target}`;
}

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — BharatiConnect Admin" },
      { name: "description", content: "Who changed what, when, with a before and after view." },
      { property: "og:title", content: "Audit Log — BharatiConnect Admin" },
      { property: "og:description", content: "Full trail of administrative actions." },
    ],
  }),
  component: Audit,
});

function Audit() {
  const { t } = useTranslation();
  const { audit } = useAppState();
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");

  const rows = audit.filter(
    (a) =>
      a.actor.toLowerCase().includes(actor.toLowerCase()) &&
      a.action.toLowerCase().includes(action.toLowerCase()),
  );
  const formatTimestamp = (value: AuditEntry["timestamp"] | AuditEntry["at"]) => {
    const date =
      value instanceof Date
        ? value
        : typeof value === "object" && value !== null && "toDate" in value
          ? value.toDate()
          : typeof value === "string"
            ? new Date(value)
            : null;
    return date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "medium",
        }).format(date)
      : "—";
  };

  return (
    <AdminShell title={t("admin.audit")}>
      <div className="glass space-y-4 rounded-3xl p-5">
        <div className="flex flex-wrap gap-2">
          <Input
            className="h-10 w-48"
            placeholder="Actor"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
          <Input
            className="h-10 w-48"
            placeholder="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>{t("admin.diff")}</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.actor}</TableCell>
                <TableCell>
                  <code className="text-xs">{a.action}</code>
                </TableCell>
                <TableCell>{a.target}</TableCell>
                <TableCell className="text-xs">{getAuditChange(a)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatTimestamp(a.timestamp ?? a.at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
