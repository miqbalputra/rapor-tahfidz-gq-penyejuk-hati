// Helper haptic feedback via Vibration API untuk feedback simpan/sukses/error.
// Native browser API (0KB), tidak butuh file audio, tidak diblokir autoplay policy,
// dan otomatis silent jika device tidak mendukung (desktop/iOS).

type HapticPattern = "success" | "error" | "warning" | "tap";

const patterns: Record<HapticPattern, number | number[]> = {
  // Getaran tunggal pendek (sukses simpan).
  success: 30,
  // Dua getaran cepat (error/peringatan).
  error: [20, 40, 20],
  // Tiga getaran ringan (warning).
  warning: [15, 30, 15, 30, 15],
  // Tap kecil untuk konfirmasi tindakan minor.
  tap: 10,
};

export function haptic(pattern: HapticPattern = "success") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    // Beberapa device throw error jika autoplay policy aktif. Aman diabaikan.
  }
}
