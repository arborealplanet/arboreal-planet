export function HomeLogoAnimation() {
  return (
    <div
      className="relative mx-auto w-full max-w-[620px] overflow-hidden bg-black sm:max-w-[680px]"
      role="img"
      aria-label="Animated Arboreal Planet logo"
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/branding/arboreal-planet-logo.webp"
        disablePictureInPicture
        aria-hidden="true"
        className="block h-auto w-full object-contain"
      >
        <source src="/branding/arboreal-planet-home-loop.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
