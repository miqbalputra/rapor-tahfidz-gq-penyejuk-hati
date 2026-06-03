"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("Gunakan akun yang dibuat oleh admin sekolah.");
  const [loadingMode, setLoadingMode] = useState<"password" | "google" | null>(null);

  async function handleLogin() {
    if (loadingMode !== null || !email || !password) return;
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Environment Supabase belum lengkap. Cek .env.local.");
      return;
    }

    setLoadingMode("password");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoadingMode(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login berhasil. Mengalihkan ke dashboard...");
    const nextPath = new URLSearchParams(window.location.search).get("next");
    router.push(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard");
    router.refresh();
  }

  async function handleGoogleLogin() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Environment Supabase belum lengkap. Cek .env.local.");
      return;
    }

    setLoadingMode("google");
    setMessage("Menghubungkan ke Google...");
    const nextPath = getSafeNextPath();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${nextPath}`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      setLoadingMode(null);
      setMessage(error.message);
      return;
    }

    if (!data.url) {
      setLoadingMode(null);
      setMessage("Supabase tidak mengembalikan URL login Google. Cek konfigurasi provider Google.");
      return;
    }

    window.location.assign(data.url);
  }

  return (
    <section className="w-full max-w-md rounded-md border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(15,15,15,0.08)]">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-md bg-[var(--foreground)] text-[var(--surface)]">
          <BookOpenCheck size={26} />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Login</h1>
          <p className="text-sm text-[var(--muted)]">Griya Qur&apos;an Penyejuk Hati</p>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleLogin();
        }}
      >
        <Button className="w-full" disabled={loadingMode !== null} onClick={handleGoogleLogin} type="button" variant="secondary">
          <GoogleIcon />
          {loadingMode === "google" ? "Menghubungkan..." : "Masuk dengan Google"}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">atau</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@gqpenyejukhati.sch.id"
            type="email"
            value={email}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              autoComplete="current-password"
              className="pr-12"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[var(--muted)] hover:text-[var(--foreground)]"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <Button className="w-full" disabled={loadingMode !== null || !email || !password} type="submit">
          <LogIn size={18} />
          {loadingMode === "password" ? "Memproses..." : "Masuk"}
        </Button>
      </form>

      <p className="mt-5 rounded-md bg-[var(--surface-soft)] p-3 text-center text-sm text-[var(--muted)]">{message}</p>
    </section>
  );
}

function getSafeNextPath() {
  const nextPath = new URLSearchParams(window.location.search).get("next");
  return nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-[18px] shrink-0" viewBox="0 0 24 24">
      <path
        d="M21.6 12.23c0-.76-.07-1.49-.19-2.18H12v4.12h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.47z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.89 6.62-2.4l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.93A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.93V7.48H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.52l3.35-2.59z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.95c1.47 0 2.79.51 3.82 1.5l2.87-2.87C16.95 2.96 14.7 2 12 2a10 10 0 0 0-8.94 5.48l3.35 2.59C7.2 7.71 9.4 5.95 12 5.95z"
        fill="#EA4335"
      />
    </svg>
  );
}
