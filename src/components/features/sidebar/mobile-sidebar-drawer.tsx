"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import type { Model, Platform } from "@/types/domain";
import { SidebarBody } from "./sidebar";

interface MobileSidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(
  null,
);

function useMobileSidebar(): MobileSidebarContextValue {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) {
    throw new Error(
      "useMobileSidebar must be used inside <MobileSidebarProvider>",
    );
  }
  return ctx;
}

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return (
    <MobileSidebarContext.Provider value={value}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function MobileSidebarTrigger() {
  const { setOpen } = useMobileSidebar();
  return (
    <button
      type="button"
      aria-label="Open navigation menu"
      onClick={() => setOpen(true)}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-text-muted transition-colors hover:bg-hover hover:text-text lg:hidden"
    >
      <Menu className="h-[18px] w-[18px]" strokeWidth={1.8} />
    </button>
  );
}

interface MobileSidebarDrawerProps {
  models: Model[];
  platforms: Platform[];
  savedCount?: number;
}

export function MobileSidebarDrawer({
  models,
  platforms,
  savedCount,
}: MobileSidebarDrawerProps) {
  const { open, setOpen } = useMobileSidebar();
  const pathname = usePathname();

  // Close drawer on route change so navigation feels natural on mobile.
  const close = useCallback(() => setOpen(false), [setOpen]);
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="pf-drawer-overlay fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm lg:hidden" />
        <Dialog.Content
          aria-label="Navigation menu"
          className="pf-drawer-content fixed inset-y-0 left-0 z-[80] flex w-[280px] max-w-[85vw] flex-col border-r bg-surface shadow-xl outline-none lg:hidden"
        >
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Browse models, platforms, and account links.
          </Dialog.Description>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={close}
            className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-[10px] text-text-muted transition-colors hover:bg-hover hover:text-text"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
          <SidebarBody
            models={models}
            platforms={platforms}
            savedCount={savedCount}
            variant="drawer"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
