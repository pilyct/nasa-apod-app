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
    <div className="mx-auto max-w-170 rounded-2xl bg-hero-bg/5 px-4 py-8 backdrop-blur-md md:px-8">
      <h1 className="text-2xl font-semibold text-hero-fg">{apod.title}</h1>
      <p className="mt-1 text-sm text-muted opacity-70">
        {formatDate(apod.date)}
        {apod.copyright && <> · © {apod.copyright}</>}
      </p>
      <p className="mt-6 font-serif text-lg leading-relaxed text-hero-fg">
        {apod.explanation}
      </p>
    </div>
  );
}
