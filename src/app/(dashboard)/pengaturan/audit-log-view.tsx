"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { HelpText } from "@/components/ui/help-text";
import { DataTable } from "@/components/ui/table";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuditRow = {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  created_at: string;
};

type ActorRow = { id: string; full_name: string };

const actionTones: Record<string, "green" | "amber" | "red" | "neutral"> = {
  create: "green",
  update: "amber",
  delete: "red",
};

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [actors, setActors] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Audit log mencatat semua perubahan nilai, presensi, dan rapor.");
  const [hasAccess, setHasAccess] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setMessage("Belum login.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.user.id).maybeSingle();
    const allowedRole = profile?.role === "admin" || profile?.role === "koordinator";
    setHasAccess(Boolean(allowedRole));

    if (!allowedRole) {
      setMessage("Hanya admin atau koordinator yang dapat melihat audit log.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .select("id,actor_id,entity_type,entity_id,action,created_at")
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as AuditRow[];
    const actorIds = Array.from(new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id))));
    const { data: actorRows } = actorIds.length
      ? await supabase.from("profiles").select("id,full_name").in("id", actorIds)
      : { data: [] as ActorRow[] };
    setActors(new Map(((actorRows ?? []) as ActorRow[]).map((row) => [row.id, row.full_name])));
    setLogs(rows);
    setMessage(`Menampilkan ${rows.length} aktivitas terbaru.`);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!hasAccess) {
    return (
      <Card>
        <HelpText icon={<History size={18} />} title="Audit log dibatasi">
          {message}
        </HelpText>
      </Card>
    );
  }

  const rows = logs.map((log) => [
    formatDate(log.created_at),
    actors.get(log.actor_id ?? "") ?? "Sistem",
    <span key={`${log.id}-table`} className="font-mono text-xs">
      {log.entity_type}
    </span>,
    <Badge key={`${log.id}-action`} tone={actionTones[log.action] ?? "neutral"}>
      {log.action}
    </Badge>,
  ]);

  return (
    <Card>
      <SectionHeader
        title="Audit Log"
        description="80 aktivitas terbaru pada nilai, presensi, dan rapor."
        action={
          <Button disabled={loading} onClick={loadData} type="button" variant="secondary">
            <RefreshCw size={18} />
            Muat Ulang
          </Button>
        }
      />
      <HelpText icon={<History size={18} />} className="mb-4">
        {message} Setiap perubahan disimpan otomatis lewat trigger database, jadi tidak bisa dihapus dari aplikasi.
      </HelpText>
      <DataTable
        columns={["Waktu", "Pengguna", "Tabel", "Aksi"]}
        entityLabel="aktivitas"
        pageSize={10}
        rows={rows}
      />
    </Card>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
