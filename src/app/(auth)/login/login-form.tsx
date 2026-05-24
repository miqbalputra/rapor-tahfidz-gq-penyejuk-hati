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
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Environment Supabase belum lengkap. Cek .env.local.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login berhasil. Mengalihkan ke dashboard...");
    const nextPath = new URLSearchParams(window.location.search).get("next");
    router.push(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard");
    router.refresh();
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-md bg-[var(--primary)] text-white">
          <BookOpenCheck size={26} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Login</h1>
          <p className="text-sm text-[var(--muted)]">Griya Qur&apos;an Penyejuk Hati</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
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
        <Button className="w-full" disabled={loading || !email || !password} onClick={handleLogin} type="button">
          <LogIn size={18} />
          {loading ? "Memproses..." : "Masuk"}
        </Button>
      </form>

      <p className="mt-5 rounded-md bg-[var(--surface-soft)] p-3 text-center text-sm text-[var(--muted)]">{message}</p>
    </section>
  );
}
