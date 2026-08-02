/**
 * Landing-page footer only. Fixed to the viewport bottom so it sits over the
 * hero art without changing the scene layout or scroll behaviour.
 */
const GITHUB = "https://github.com/Crisiswastaken/Uno-Groovy";
const PORTFOLIO = "https://crisiswastaken.me";

const link =
  "pointer-events-auto text-uno-ink2/65 hover:text-uno-ink1 transition-colors duration-200";

export function HomeFooter() {
  return (
    <footer
      aria-label="Site"
      className="fixed inset-x-0 bottom-0 z-10 pointer-events-none pb-[clamp(0.65rem,2.2vh,1.1rem)] px-4"
    >
      <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[0.6875rem] leading-snug tracking-[0.01em] text-uno-ink2/55 text-center">
        <a
          href={GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          GitHub
        </a>
        <span aria-hidden className="select-none text-uno-ink2/35">
          ·
        </span>
        <span>
          Designed and developed by{" "}
          <a
            href={PORTFOLIO}
            target="_blank"
            rel="noopener noreferrer"
            className={`${link} underline decoration-uno-ink2/25 underline-offset-[0.2em] hover:decoration-uno-ink1/40`}
          >
            Vince
          </a>
        </span>
      </p>
    </footer>
  );
}
