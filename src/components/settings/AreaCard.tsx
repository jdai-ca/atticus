import { useEffect, useRef } from 'react';

interface AreaCardProps {
  readonly children: React.ReactNode;
  readonly color: string;
  readonly className?: string;
}

/** Card with a dynamic left-border color driven by the area's `color` field. */
export function AreaCard({ children, color, className }: AreaCardProps) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current) {
      divRef.current.style.borderLeftColor = color;
    }
  }, [color]);

  return (
    <div ref={divRef} className={className}>
      {children}
    </div>
  );
}
