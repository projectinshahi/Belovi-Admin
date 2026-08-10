"use client";

/**
 * The BELOVI wordmark — using the provided brand logo image.
 */
export default function Logo({
  className = "",
  priority = false,
  tone, // Ignored since we are using a fixed image
  ...props
}: {
  className?: string;
  priority?: boolean;
  tone?: string;
  [key: string]: any;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/logo-alt.png"
      alt="BELOVI"
      className={`object-contain ${className}`}
      {...props}
    />
  );
}
