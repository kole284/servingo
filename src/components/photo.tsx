import type { ReactNode } from "react";
import Image from "next/image";

/**
 * A restaurant or dish photo filling its box, or the grey placeholder until one is uploaded.
 * `className` sizes the box; `sizes` tells next/image how wide it is drawn.
 */
export function Photo({
  src,
  alt,
  sizes,
  className = "",
  children,
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden bg-surface ${className}`} {...(src ? {} : { role: "img", "aria-label": alt })}>
      {src && <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />}
      {children}
    </div>
  );
}
