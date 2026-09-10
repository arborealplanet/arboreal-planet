type NavIconId = "home" | "breeding" | "colony" | "clutches" | "market";

export function ChondroBreederNavIcon({ id, className = "h-5 w-5" }: { id: NavIconId; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (id === "home") {
    return <svg {...common}><path d="M3.5 10.8 12 3.8l8.5 7"/><path d="M5.5 9.4V20h13V9.4"/><path d="M9.5 20v-6h5v6"/></svg>;
  }

  if (id === "breeding") {
    return <svg {...common}><path d="M8.4 4.2c-2.2 0-4 1.7-4 3.9 0 4.6 7.6 9.6 7.6 9.6s7.6-5 7.6-9.6c0-2.2-1.8-3.9-4-3.9-1.5 0-2.8.8-3.6 2-.8-1.2-2.1-2-3.6-2Z"/><path d="M8.5 10.7c1.2-.9 2.3-.9 3.5 0s2.3.9 3.5 0"/></svg>;
  }

  if (id === "colony") {
    return <svg {...common}><path d="M4.2 14.2c2.1-5.4 5.5-8.1 10-8.1 3.5 0 5.6 1.8 5.6 4.2 0 2.2-1.8 3.8-4.4 3.8H9.8c-2.3 0-3.7 1.2-3.7 2.8 0 1.7 1.5 2.9 3.6 2.9 2.4 0 4.1-1 5.2-3"/><circle cx="16.5" cy="9.2" r=".8" fill="currentColor" stroke="none"/></svg>;
  }

  if (id === "clutches") {
    return <svg {...common}><ellipse cx="8" cy="13" rx="3.2" ry="4.7"/><ellipse cx="15.8" cy="12.4" rx="3.2" ry="4.7"/><path d="M11 18.4c.7 1.1 2 1.8 3.6 1.8 2.7 0 4.8-1.7 4.8-4"/></svg>;
  }

  return <svg {...common}><path d="M5 8.5h14l-1 11H6l-1-11Z"/><path d="M8.3 8.5V6.7A3.7 3.7 0 0 1 12 3a3.7 3.7 0 0 1 3.7 3.7v1.8"/><path d="M9.2 13.4h5.6M12 10.9v5"/></svg>;
}
