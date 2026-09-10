type NavIconId = "home" | "breeding" | "colony" | "clutches" | "market";

export function ChondroBreederNavIcon({ id, className = "h-6 w-6" }: { id: NavIconId; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.35,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (id === "home") {
    return (
      <svg {...common}>
        <path d="M3.5 10.7 12 3.8l8.5 6.9" />
        <path d="M5.6 9.4v10.2h12.8V9.4" />
        <path d="M9.7 19.6v-5.4h4.6v5.4" />
      </svg>
    );
  }

  if (id === "breeding") {
    return (
      <svg {...common}>
        <path d="M7.1 5.2c-2.2 0-3.8 1.5-3.8 3.5 0 2.3 2.3 3.6 4.6 4.7 2.6 1.2 4.1 2.3 4.1 4 0 1.5-1.3 2.6-3 2.6-1.5 0-2.7-.6-3.6-1.6" />
        <path d="M16.9 5.2c2.2 0 3.8 1.5 3.8 3.5 0 2.3-2.3 3.6-4.6 4.7-2.6 1.2-4.1 2.3-4.1 4 0 1.5 1.3 2.6 3 2.6 1.5 0 2.7-.6 3.6-1.6" />
        <path d="M8.5 8.6h7M8.4 15.4h7.2" />
      </svg>
    );
  }

  if (id === "colony") {
    return (
      <svg {...common}>
        <path d="M3.2 17.7h17.6" />
        <path d="M5 15.2c1.2-5.2 4.3-8 8.7-8 3.8 0 6.4 2 6.4 4.7 0 2.5-2.1 4.1-5.1 4.1h-4.8c-1.5 0-2.5.7-2.5 1.8 0 1.2 1.2 2 2.8 2 1.8 0 3.2-.6 4.3-1.8" />
        <circle cx="16.8" cy="10.7" r=".85" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (id === "clutches") {
    return (
      <svg {...common}>
        <path d="M8.1 4.4c-2.7 3.2-4.1 6.3-4.1 9.2 0 3.8 2.3 6.4 5.5 6.4s5.5-2.6 5.5-6.4c0-2.9-1.4-6-4.1-9.2a1.8 1.8 0 0 0-2.8 0Z" />
        <path d="M15.6 7.4c2.9 3.3 4.4 6.2 4.4 8.6 0 2.6-1.6 4.4-3.9 4.4-1.1 0-2.1-.4-2.8-1.1" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 8.3h16" />
      <path d="m5 8.3 1.1-3.6h11.8L19 8.3" />
      <path d="M5 8.3v10.8h14V8.3" />
      <path d="M8.4 19.1v-4.5h7.2v4.5" />
      <path d="M6.2 8.3v2.5M10.1 8.3v2.5M13.9 8.3v2.5M17.8 8.3v2.5" />
    </svg>
  );
}
