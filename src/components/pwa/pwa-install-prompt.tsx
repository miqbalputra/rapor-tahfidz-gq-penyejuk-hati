"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_DISMISSED_KEY = "rapor-gq-install-dismissed-at";
const INSTALL_DONE_KEY = "rapor-gq-installed";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));

    if (isStandalone || window.localStorage.getItem(INSTALL_DONE_KEY) === "true") {
      setVisible(false);
      return;
    }

    const dismissedAt = Number(window.localStorage.getItem(INSTALL_DISMISSED_KEY) ?? 0);
    const recentlyDismissed = dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (recentlyDismissed) return;
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      window.localStorage.setItem(INSTALL_DONE_KEY, "true");
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installEvent) return;

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      window.localStorage.setItem(INSTALL_DONE_KEY, "true");
    } else {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    }

    setVisible(false);
    setInstallEvent(null);
  }

  function dismissPrompt() {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible || !installEvent) return null;

  return (
    <div className="no-print fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 sm:left-auto sm:right-5 sm:w-[360px] lg:bottom-5">
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-[var(--foreground)]">Install Rapor GQ</p>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">Buka lebih cepat dari layar utama HP guru.</p>
          </div>
          <button
            aria-label="Tutup popup install"
            className="grid size-9 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-soft)]"
            onClick={dismissPrompt}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={installApp} type="button">
            <Download size={18} />
            Install
          </Button>
          <Button onClick={dismissPrompt} type="button" variant="secondary">
            Nanti
          </Button>
        </div>
      </div>
    </div>
  );
}
