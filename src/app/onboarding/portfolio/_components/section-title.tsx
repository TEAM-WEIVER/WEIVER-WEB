export function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-primary-700 h-7 w-1" />
      <h2 className="text-h3 text-text-primary">{title}</h2>
    </div>
  );
}
