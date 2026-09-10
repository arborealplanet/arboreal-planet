export function HomeLogoAnimation() {
  return (
    <div
      className="home-logo-stage"
      role="img"
      aria-label="Arboreal Planet logo"
    >
      <style>{`
        .home-logo-stage {
          position: relative;
          width: min(88vw, 430px);
          aspect-ratio: 2.15 / 1;
          display: grid;
          place-items: center;
          isolation: isolate;
        }

        .home-logo-frame {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 14px 28px rgba(0,0,0,.32));
          animation: arboreal-logo-float 7s ease-in-out infinite;
          will-change: transform;
        }

        .home-logo-halo {
          position: absolute;
          z-index: 0;
          inset: 18% 12% 10%;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(57,230,125,.14), rgba(57,230,125,.04) 46%, transparent 72%);
          filter: blur(22px);
          opacity: .55;
          animation: arboreal-logo-glow 7s ease-in-out infinite;
        }

        @keyframes arboreal-logo-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-5px) scale(1.008); }
        }

        @keyframes arboreal-logo-glow {
          0%, 100% { opacity: .42; transform: scale(.98); }
          50% { opacity: .68; transform: scale(1.035); }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-logo-frame,
          .home-logo-halo {
            animation: none !important;
          }
        }
      `}</style>

      <div className="home-logo-halo" aria-hidden="true" />
      <img
        src="/branding/arboreal-planet-logo.webp?v=home-animation-2"
        alt="Arboreal Planet"
        className="home-logo-frame"
      />
    </div>
  );
}
