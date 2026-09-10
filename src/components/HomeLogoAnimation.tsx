export function HomeLogoAnimation() {
  return (
    <div
      className="home-logo-stage"
      role="img"
      aria-label="Animated Arboreal Planet logo"
    >
      <style>{`
        .home-logo-stage {
          position: relative;
          width: min(100%, 620px);
          aspect-ratio: 1 / 1;
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
          transform-origin: 50% 52%;
          will-change: transform, filter;
          animation: arboreal-logo-frames 3.4s steps(1, end) infinite;
          filter: drop-shadow(0 22px 44px rgba(0, 0, 0, .34));
        }

        .home-logo-halo {
          position: absolute;
          z-index: 0;
          inset: 10% 9% 13%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(57,230,125,.18), rgba(27,117,79,.07) 42%, transparent 72%);
          filter: blur(24px);
          animation: arboreal-halo-frames 3.4s steps(1, end) infinite;
        }

        .home-logo-sheen {
          position: absolute;
          z-index: 3;
          inset: 8% 9% 12%;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(112deg, transparent 34%, rgba(255,255,255,.13) 48%, transparent 62%);
          mix-blend-mode: screen;
          transform: translateX(-38%);
          animation: arboreal-logo-sheen 6.8s ease-in-out infinite;
          mask-image: radial-gradient(ellipse at center, black 32%, transparent 74%);
        }

        .home-logo-fireflies {
          position: absolute;
          z-index: 4;
          inset: 5%;
          pointer-events: none;
        }

        .home-logo-fireflies span {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(183,255,114,.92);
          box-shadow: 0 0 8px rgba(126,255,91,.95), 0 0 18px rgba(57,230,125,.65);
          opacity: .18;
          animation: arboreal-firefly 3.6s steps(1, end) infinite;
        }

        .home-logo-fireflies span:nth-child(1) { left: 11%; top: 26%; animation-delay: -.4s; }
        .home-logo-fireflies span:nth-child(2) { right: 13%; top: 18%; animation-delay: -1.1s; }
        .home-logo-fireflies span:nth-child(3) { left: 17%; bottom: 27%; animation-delay: -2.2s; }
        .home-logo-fireflies span:nth-child(4) { right: 16%; bottom: 31%; animation-delay: -2.8s; }
        .home-logo-fireflies span:nth-child(5) { left: 35%; top: 8%; animation-delay: -1.7s; }
        .home-logo-fireflies span:nth-child(6) { right: 32%; bottom: 15%; animation-delay: -.8s; }

        @keyframes arboreal-logo-frames {
          0%, 11%   { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); filter: brightness(1) saturate(1) drop-shadow(0 22px 44px rgba(0,0,0,.34)); }
          12%, 23%  { transform: translate3d(-1px, -2px, 0) scale(1.006) rotate(-.08deg); filter: brightness(1.01) saturate(1.01) drop-shadow(0 24px 46px rgba(0,0,0,.36)); }
          24%, 35%  { transform: translate3d(1px, -5px, 0) scale(1.013) rotate(.10deg); filter: brightness(1.025) saturate(1.015) drop-shadow(0 27px 50px rgba(0,0,0,.38)); }
          36%, 47%  { transform: translate3d(0, -8px, 0) scale(1.02) rotate(-.14deg); filter: brightness(1.04) saturate(1.025) drop-shadow(0 30px 54px rgba(0,0,0,.40)); }
          48%, 59%  { transform: translate3d(1px, -5px, 0) scale(1.013) rotate(.10deg); filter: brightness(1.025) saturate(1.015) drop-shadow(0 27px 50px rgba(0,0,0,.38)); }
          60%, 71%  { transform: translate3d(-1px, -2px, 0) scale(1.006) rotate(-.08deg); filter: brightness(1.01) saturate(1.01) drop-shadow(0 24px 46px rgba(0,0,0,.36)); }
          72%, 83%  { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); filter: brightness(1) saturate(1) drop-shadow(0 22px 44px rgba(0,0,0,.34)); }
          84%, 100% { transform: translate3d(0, 2px, 0) scale(.997) rotate(.05deg); filter: brightness(.995) saturate(1) drop-shadow(0 20px 42px rgba(0,0,0,.32)); }
        }

        @keyframes arboreal-halo-frames {
          0%, 23%  { opacity: .42; transform: scale(.98); }
          24%, 47% { opacity: .72; transform: scale(1.04); }
          48%, 71% { opacity: .56; transform: scale(1.01); }
          72%,100% { opacity: .42; transform: scale(.98); }
        }

        @keyframes arboreal-firefly {
          0%, 18%  { opacity: .12; transform: translate(0, 0) scale(.7); }
          19%, 38% { opacity: .9; transform: translate(5px, -7px) scale(1); }
          39%, 61% { opacity: .28; transform: translate(9px, -3px) scale(.8); }
          62%, 79% { opacity: .78; transform: translate(4px, 4px) scale(.9); }
          80%,100% { opacity: .12; transform: translate(0, 0) scale(.7); }
        }

        @keyframes arboreal-logo-sheen {
          0%, 64% { opacity: 0; transform: translateX(-38%); }
          70% { opacity: .4; }
          82% { opacity: .13; transform: translateX(38%); }
          88%, 100% { opacity: 0; transform: translateX(38%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-logo-frame,
          .home-logo-halo,
          .home-logo-fireflies span,
          .home-logo-sheen {
            animation: none !important;
          }
          .home-logo-halo { opacity: .48; }
        }
      `}</style>

      <div className="home-logo-halo" aria-hidden="true" />
      <img
        src="/branding/arboreal-planet-logo.webp?v=home-animation-1"
        alt="Arboreal Planet"
        className="home-logo-frame"
      />
      <div className="home-logo-fireflies" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="home-logo-sheen" aria-hidden="true" />
    </div>
  );
}
