import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07110d",
          color: "#f4f7f5",
          fontSize: 60,
          fontWeight: 900,
          letterSpacing: "-4px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 112,
            height: 112,
            borderRadius: 999,
            border: "5px solid rgba(92,255,149,.55)",
            background: "rgba(57,230,125,.08)",
          }}
        />
        <span style={{ position: "relative" }}>AP</span>
      </div>
    ),
    size,
  );
}
