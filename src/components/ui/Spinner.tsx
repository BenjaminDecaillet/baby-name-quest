export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-stone-500"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-rose-500"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
