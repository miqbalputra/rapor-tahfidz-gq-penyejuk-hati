"use client";

import { useState } from "react";
import { BookMarked, ScrollText } from "lucide-react";
import { TabBar } from "@/components/ui/tab-bar";
import { ReportCardClient } from "./report-card-client";
import { SemesterReportClient } from "./semester-report-client";

type ReportTab = "tahfidz" | "semester";

export function RaporWorkspace() {
  const [activeTab, setActiveTab] = useState<ReportTab>("tahfidz");

  return (
    <div className="space-y-6">
      <TabBar
        active={activeTab}
        items={[
          {
            id: "tahfidz",
            label: "Rapor Tahfidz",
            description: "Template Word untuk Juz 29 dan Juz 30 yang sudah berjalan saat ini.",
            icon: <BookMarked size={18} />,
          },
          {
            id: "semester",
            label: "Rapor Semester",
            description: "Template Excel sekolah untuk rekap semester dan cetak massal.",
            icon: <ScrollText size={18} />,
          },
        ]}
        onChange={setActiveTab}
      />

      {activeTab === "tahfidz" ? <ReportCardClient /> : <SemesterReportClient />}
    </div>
  );
}
