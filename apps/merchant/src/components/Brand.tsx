import Link from "next/link";
export function Brand() {
  return (
    <Link href="/stores" className="brand" aria-label="EYN home">
      <img
        className="logo-light"
        src="/brand/only-dark-logo-no-bg.png"
        alt=""
      />
      <img
        className="logo-dark"
        src="/brand/only-white-logo-no-bg.png"
        alt=""
      />
      <span>
        EYN<small>EVERYTHING YOU NEED</small>
      </span>
    </Link>
  );
}
