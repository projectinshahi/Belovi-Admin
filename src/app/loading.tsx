import Spinner from '@/components/ui/Spinner';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Spinner size={28} />
      <p className="eyebrow text-faint">Loading</p>
    </div>
  );
}
