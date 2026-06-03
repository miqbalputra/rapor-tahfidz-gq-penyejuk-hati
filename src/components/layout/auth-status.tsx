"use client";

import Link from "next/link";
import { LogOut, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setEmail(null);
  }

  if (!email) {
    return (
      <Link
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--foreground)] px-4 text-sm font-semibold text-[var(--surface)] shadow-sm transition hover:bg-[var(--primary-strong)]"
        href="/login"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground)] sm:flex">
        <UserCircle size={18} />
        {email}
      </div>
      <Button onClick={signOut} type="button" variant="secondary">
        <LogOut size={18} />
        Keluar
      </Button>
    </div>
  );
}
