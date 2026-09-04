/** A short quoted note with its author, e.g. « Ma note : "Doux et court" ». */
export function NoteText({ label, note }: { label: string; note: string | null | undefined }) {
  if (!note) return null;
  return (
    <p className="text-sm text-stone-600">
      <span className="font-semibold text-stone-500">{label} :</span>{' '}
      <span className="italic">« {note} »</span>
    </p>
  );
}
