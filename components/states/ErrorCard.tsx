export function ErrorCard({
  message = "Couldn't load today's picture. Try again.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-170 flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-hero-fg">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-hero-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-accent"
      >
        Retry
      </button>
    </div>
  );
}
