import { z } from "zod";

export const predicateDescriptionSchema = z.object({
  range: z.string(),
  label: z.string(),
  description: z.string().optional().default(""),
  italic_label: z.boolean().optional().default(true),
});

export const reportPayloadSchema = z.object({
  juz: z.union([z.literal(29), z.literal(30)]),
  studentName: z.string().min(1, "Nama santri wajib diisi"),
  jilid: z.string().optional(),
  className: z.string(),
  semester: z.string(),
  academicYear: z.string(),
  reportDate: z.string(),
  coordinatorName: z.string(),
  homeroomName: z.string(),
  note: z.string(),
  // Field optional dari school_settings; jika kosong, template DOCX tetap pakai default-nya.
  institutionName: z.string().optional(),
  institutionAddress: z.string().optional(),
  // Keterangan di bawah tabel rapor: kelas target dan range surat target.
  // Kalau tidak diisi, template tetap pakai default ("Kelas 4" / "Surat An-Nas s.d 'Abasa").
  targetClass: z.string().optional(),
  targetSemester: z.string().optional(),
  targetSurahRange: z.string().optional(),
  // Keterangan predikat (4 baris). Kalau kosong, default template tetap dipakai.
  predicateDescriptions: z.array(predicateDescriptionSchema).optional(),
  setoran: z.array(
    z.object({
      no: z.number(),
      surat: z.string(),
      kelancaran: z.union([z.string(), z.number()]),
      fashohah: z.union([z.string(), z.number()]),
      tajwid: z.union([z.string(), z.number()]),
      nilai: z.union([z.string(), z.number()]),
    }),
  ),
  juziyah: z.object({
    juzLabel: z.string(),
    kelancaran: z.union([z.string(), z.number()]),
    fashohah: z.union([z.string(), z.number()]),
    tajwid: z.union([z.string(), z.number()]),
    rata2: z.union([z.string(), z.number()]),
    predikat: z.string(),
  }),
});
