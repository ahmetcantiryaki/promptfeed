import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-[18px] font-bold text-accent-fg">
            P
          </span>
          <span className="text-[17px] font-semibold tracking-tight">
            PromptFeed
          </span>
        </Link>
        <div className="rounded-[12px] border bg-surface p-6 shadow-surface">
          {children}
        </div>
      </div>
    </div>
  );
}
