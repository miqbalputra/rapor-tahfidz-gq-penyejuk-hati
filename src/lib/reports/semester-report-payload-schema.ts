import { z } from "zod";

const testedSurahSchema = z.object({
  name: z.string().optional().default(""),
  score: z.union([z.string(), z.number()]).optional().default("-"),
});

export const semesterReportPayloadSchema = z.object({
  studentName: z.string().min(1, "Nama santri wajib diisi"),
  className: z.string().min(1, "Kelas wajib diisi"),
  academicYear: z.string().min(1, "Tahun ajaran wajib diisi"),
  semester: z.string().min(1, "Semester wajib diisi"),
  reportDate: z.string().min(1, "Tanggal rapor wajib diisi"),
  jilid: z.string().optional().default(""),
  readingType: z.string().optional().default("Baca Tartili"),
  readingScore: z.union([z.string(), z.number()]).optional().default("-"),
  targetJuz: z.string().optional().default(""),
  targetSurah: z.string().optional().default(""),
  targetDescription: z.string().optional().default(""),
  testedSurahs: z.array(testedSurahSchema).max(2).optional().default([]),
  materialScores: z.object({
    wudhu: z.union([z.string(), z.number()]).optional().default("-"),
    sholat: z.union([z.string(), z.number()]).optional().default("-"),
    tayamum: z.union([z.string(), z.number()]).optional().default("-"),
    shalatJenazah: z.union([z.string(), z.number()]).optional().default("-"),
    doaHarian: z.union([z.string(), z.number()]).optional().default("-"),
    hafalanHadits: z.union([z.string(), z.number()]).optional().default("-"),
  }),
  attendance: z.object({
    sick: z.union([z.string(), z.number()]).optional().default("-"),
    permission: z.union([z.string(), z.number()]).optional().default("-"),
    absent: z.union([z.string(), z.number()]).optional().default("-"),
  }),
  personality: z.object({
    teacher: z.string().optional().default("-"),
    friend: z.string().optional().default("-"),
    neatness: z.string().optional().default("-"),
    discipline: z.string().optional().default("-"),
  }),
  descriptionResult: z.enum(["Tidak Tercapai", "Tercapai", "Melampaui"]).optional().default("Tercapai"),
  customDescription: z.string().optional(),
  homeroomTeacherName: z.string().min(1, "Nama wali kelas wajib diisi"),
  coordinatorName: z.string().min(1, "Nama koordinator wajib diisi"),
});

export type SemesterReportPayload = z.infer<typeof semesterReportPayloadSchema>;
