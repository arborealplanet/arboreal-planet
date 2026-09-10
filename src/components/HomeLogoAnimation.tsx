export function HomeLogoAnimation() {
  return (
    <div
      className="home-logo-stage"
      role="img"
      aria-label="Animated Arboreal Planet logo"
    >
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
