const logoSrc = new URL("../assets/AnkaOlive.jpeg", import.meta.url).href;

function BrandLogo() {
  return (
    <img
      src={logoSrc}
      alt="Anka logo"
      className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-lg shadow-blue-900/20"
    />
  );
}

export default BrandLogo;
