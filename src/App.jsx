import WaitlistForm from './components/WaitlistForm.jsx';
import { joinWaitlist } from './api.js';
import logoUrl from './assets/logo.svg';

const FEATURES = [
  { title: 'Snap the cover', text: 'Log a book in seconds from a photo of its cover.' },
  { title: 'Keep the lines', text: 'Save passages you loved, with the page number.' },
  { title: 'Find them again', text: 'Search years of reading by title, phrase or mood.' },
];

const SPINES = [
  { h: 78, w: 13, c: 'var(--spine-1)' },
  { h: 92, w: 16, c: 'var(--spine-2)' },
  { h: 70, w: 11, c: 'var(--spine-3)' },
  { h: 86, w: 15, c: 'var(--spine-4)' },
  { h: 96, w: 12, c: 'var(--spine-1)' },
  { h: 74, w: 17, c: 'var(--spine-3)' },
];

function Shelf() {
  let x = 6;
  return (
    <svg className="shelf" viewBox="0 0 140 112" aria-hidden="true" focusable="false">
      {SPINES.map((s, i) => {
        const el = <rect key={i} x={x} y={104 - s.h} width={s.w} height={s.h} rx="1.5" fill={s.c} />;
        x += s.w + 2;
        return el;
      })}
      {/* Rotated about its bottom-left corner so the top rests on the last upright spine. */}
      <rect x={x + 18} y={20} width={14} height={84} rx="1.5" fill="var(--spine-2)" transform={`rotate(-12 ${x + 18} 104)`} />
      <rect x="0" y="104" width="140" height="4" rx="1" fill="var(--ink)" opacity="0.85" />
    </svg>
  );
}

export default function App() {
  return (
    <>
      <p className="demo-banner">
        Portfolio demo: Shelfnote is a fictional product made to show a working waitlist form.
      </p>
      <div className="page">
        <header className="brand">
          <img src={logoUrl} alt="" width="32" height="32" />
          <span className="brand__name">Shelfnote</span>
        </header>

        <main className="hero">
          <div className="hero__copy">
            <p className="eyebrow">Waitlist open</p>
            <h1 className="hero__title">Remember every book you&rsquo;ve read.</h1>
            <p className="hero__sub">
              Shelfnote is a quiet reading log for people who read on paper. Snap the cover, keep the lines that stopped
              you, and find them again years later. No feeds, no streaks, no reading goals.
            </p>
            <WaitlistForm onSubmit={joinWaitlist} />
          </div>
          <Shelf />
        </main>

        <section className="features" aria-label="What Shelfnote does">
          {FEATURES.map((f) => (
            <div className="feature" key={f.title}>
              <h2 className="feature__title">{f.title}</h2>
              <p className="feature__text">{f.text}</p>
            </div>
          ))}
        </section>

        <footer className="footer">
          <span>Shelfnote demo &middot; {new Date().getFullYear()}</span>
          <nav className="footer__links" aria-label="Footer">
            <a href="/privacy.html">Privacy</a>
            <a href="https://github.com/fazal305/waitlist-page">Source on GitHub</a>
          </nav>
        </footer>
      </div>
    </>
  );
}
