export type UserRole = "admin" | "koordinator" | "guru" | "wali_kelas" | "viewer";

export type Gender = "Santriwan" | "Santriwati";

export type AttendanceStatus = "Hadir" | "Absen" | "Izin" | "Sakit";

export type TotalFormula = "sum" | "average" | "manual";

export type InputMode = "direct_score" | "mistake_deduction" | "per_item";

export type Teacher = {
  id: string;
  name: string;
  title: string;
};

export type HalaqohSeed = {
  id: string;
  name: string;
  className: string;
  gender: Gender;
  time: string;
  teacher: string;
  students: string[];
};

export type Surah = {
  juz: 29 | 30;
  order: number;
  latin: string;
  arabic?: string;
  showInReport: boolean;
};

export type AssessmentComponent = {
  code: string;
  name: string;
  maxScore: number;
  inputMode: InputMode;
  required: boolean;
};

export type AssessmentType = {
  code: string;
  name: string;
  maxScore: number;
  totalFormula: TotalFormula;
  passingMinScore?: number;
  maxFluencyMistakes?: number;
  components: AssessmentComponent[];
};

export type PredicateRule = {
  min: number;
  max: number;
  label: string;
};

