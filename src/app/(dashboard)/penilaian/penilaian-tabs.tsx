"use client";

import { useState } from "react";
import { BookOpenCheck, ClipboardList, Scroll } from "lucide-react";
import { TabBar } from "@/components/ui/tab-bar";
import { JuziyahScoringClient } from "./juziyah-scoring-client";
import { OtherExamScoringClient } from "./other-exam-scoring-client";
import { TahfidzScoringClient } from "./tahfidz-scoring-client";

type PenilaianTab = "tahfidz" | "juziyah" | "other";

export function PenilaianTabs() {
  const [active, setActive] = useState<PenilaianTab>("tahfidz");

  return (
    <div className="space-y-5">
      <TabBar
        active={active}
        items={[
          {
            id: "tahfidz",
            label: "Setoran Surat",
            description: "Nilai per surat untuk Juz 29 dan Juz 30",
            icon: <BookOpenCheck size={18} />,
          },
          {
            id: "juziyah",
            label: "Juziyah",
            description: "Nilai ujian juziyah per santri dan juz",
            icon: <Scroll size={18} />,
          },
          {
            id: "other",
            label: "Ujian Lainnya",
            description: "Tartili, Doa, Hadits, Wudhu, Sholat",
            icon: <ClipboardList size={18} />,
          },
        ]}
        onChange={(id) => setActive(id)}
      />

      {active === "tahfidz" ? <TahfidzScoringClient /> : null}
      {active === "juziyah" ? <JuziyahScoringClient /> : null}
      {active === "other" ? <OtherExamScoringClient /> : null}
    </div>
  );
}
