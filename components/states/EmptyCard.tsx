import Link from "next/link";

export function EmptyCard() {
  return (
    <div className="mx-auto flex max-w-170 flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-hero-fg">No picture published for this date.</p>
      <Link
        href="/"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-hero-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-accent"
      >
        Back to today
      </Link>
    </div>
  );
}
