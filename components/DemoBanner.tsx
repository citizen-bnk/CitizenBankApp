/** Small fixed label shown on every page when NEXT_PUBLIC_DEMO_BANNER is set. It never affects page layout. */
export default function DemoBanner() {
  const text = process.env.NEXT_PUBLIC_DEMO_BANNER;
  if (!text) return null;
  return (
    <div
      role="note"
      style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 2147483000, pointerEvents: "none",
        background: "rgba(20,16,40,.94)", color: "#f5c76b", borderRadius: "0 0 8px 8px", padding: "0 12px",
        font: "600 10px/14px system-ui, sans-serif", letterSpacing: ".03em", whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}
