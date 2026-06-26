import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  /** Format the interpolated value into a display string */
  format: (v: number) => string;
  /** Duration in ms (default 900) */
  duration?: number;
  className?: string;
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function AnimatedNumber({
  value,
  format,
  duration = 900,
  className,
}: AnimatedNumberProps) {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(format(0));
  const rafRef = useRef<number>(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(format(value));
      return;
    }

    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = easeOutExpo(elapsed);
      setDisplay(format(from + (to - from) * eased));
      if (elapsed < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, format, prefersReduced]);

  return <span className={className}>{display}</span>;
}
