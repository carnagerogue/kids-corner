import { useEffect, useRef } from "react";

const SPARKLES = ["✨", "⭐", "💫", "🌟"];

/**
 * A playful custom pointer: a spinning star that tracks the mouse exactly, a
 * soft glow ring that trails behind with easing, a sparkle trail on movement,
 * and a pop on click. Only activates on devices with a precise pointer (skips
 * touch) and tones down for `prefers-reduced-motion`.
 */
export function FunCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // No custom cursor on touch / coarse-pointer devices.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.body.classList.add("fun-cursor-on");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let lastSparkle = 0;
    let raf = 0;
    let visible = false;

    const at = (x: number, y: number) =>
      `translate(calc(${x}px - 50%), calc(${y}px - 50%))`;

    const show = () => {
      if (visible) return;
      visible = true;
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    };
    const hide = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const spawnSparkle = (x: number, y: number) => {
      const s = document.createElement("span");
      s.className = "fun-sparkle";
      s.textContent = SPARKLES[Math.floor(Math.random() * SPARKLES.length)];
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      s.style.setProperty("--sx", `${Math.round((Math.random() * 2 - 1) * 18)}px`);
      s.style.setProperty("--sy", `${Math.round((Math.random() * 2 - 1) * 18)}px`);
      document.body.appendChild(s);
      s.addEventListener("animationend", () => s.remove());
    };

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = at(mouseX, mouseY);
      show();

      const el = e.target as Element | null;
      const hovering = !!el?.closest(
        "button, a, input, select, textarea, label, [role='button']",
      );
      ring.classList.toggle("is-hover", hovering);

      if (!reduce && e.timeStamp - lastSparkle > 55) {
        lastSparkle = e.timeStamp;
        spawnSparkle(mouseX, mouseY);
      }
    };

    const onDown = () => ring.classList.add("is-down");
    const onUp = () => ring.classList.remove("is-down");

    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = at(ringX, ringY);
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", hide);
    document.addEventListener("mouseenter", show);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", hide);
      document.removeEventListener("mouseenter", show);
      document.body.classList.remove("fun-cursor-on");
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="fun-cursor-ring" aria-hidden="true">
        <span className="fun-cursor-ring__in" />
      </div>
      <div ref={dotRef} className="fun-cursor-dot" aria-hidden="true">
        <span className="fun-cursor-star">⭐</span>
      </div>
    </>
  );
}
