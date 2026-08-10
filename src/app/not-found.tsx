import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ivory px-4 text-center">
      <p className="font-display font-light text-[clamp(4rem,12vw,7rem)] leading-none text-line select-none">
        404
      </p>
      <p className="eyebrow text-bronze-deep mt-6 mb-2">Not found</p>
      <h1 className="font-display font-light text-3xl text-ink leading-tight">
        This page doesn&apos;t exist
      </h1>
      <p className="font-sans text-[13px] text-muted mt-2 mb-7 max-w-sm leading-relaxed">
        The page may have been moved, or the link may be wrong.
      </p>
      <ButtonLink href="/dashboard" variant="solid" size="sm" arrow>
        Back to the Studio
      </ButtonLink>
    </div>
  );
}
