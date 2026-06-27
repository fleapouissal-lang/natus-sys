const LOGIN_HERO_SRC = "/images/login-hero.png";
const LOGIN_HERO_WIDTH = 576;
const LOGIN_HERO_HEIGHT = 1024;

export function LoginHeroImage({ priority = true }: { priority?: boolean }) {
  return (
    // PNG natif servi tel quel (sans optimisation Next.js) pour conserver la qualité.
    <img
      src={LOGIN_HERO_SRC}
      alt="Boutique Natus Marrakech — conseil et soins"
      width={LOGIN_HERO_WIDTH}
      height={LOGIN_HERO_HEIGHT}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={false}
      className="natus-login-hero__img absolute inset-0 h-full w-full object-cover object-[center_35%]"
    />
  );
}

export { LOGIN_HERO_SRC, LOGIN_HERO_HEIGHT, LOGIN_HERO_WIDTH };
