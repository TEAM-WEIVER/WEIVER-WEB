export function SectionTitle({ title, required }: { title: string; required?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-3">
        <div className="bg-primary-700 h-7 w-1" />
        <h2 className="text-h3 text-text-primary">{title}</h2>
      </div>
      {required ? <span className="text-h3 text-error">*</span> : null}
    </div>
  );
}
