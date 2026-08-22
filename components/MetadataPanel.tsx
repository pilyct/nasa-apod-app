import type { Apod } from "@/types/apod";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function MetadataPanel({ apod }: { apod: Apod }) {
  return (
    <div className="mx-auto max-w-170 px-4 md:px-8 py-8 ">
      <h1 className="text-2xl font-semibold text-hero-fg">{apod.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {formatDate(apod.date)}
        {apod.copyright && <> · © {apod.copyright}</>}
      </p>
      <p className="mt-6 font-serif text-lg leading-relaxed text-hero-fg">
        {apod.explanation}
      </p>
    </div>
  );
}
