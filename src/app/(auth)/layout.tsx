import Link from "next/link";
import { LogoMark } from "@/components/ui/logo-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" aria-label="PromptFeed" className="mb-8 flex items-center justify-center">
          <LogoMark height={36} />
        </Link>
        <div className="rounded-[12px] border bg-surface p-6 shadow-surface">
          {children}
        </div>
      </div>
    </div>
  );
}
