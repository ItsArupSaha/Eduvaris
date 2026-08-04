/**
 * Footer — clean, professional, trademark-safe.
 *
 * NOTE: the word "IELTS" is intentionally never used here. We reference the
 * exam generically ("the official English proficiency exam") to stay clear of
 * trademark issues while remaining understandable.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-amber-200/60 bg-amber-50">
      <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-orange-500 text-white text-xs font-bold">
            E
          </span>
          <p className="text-xs text-slate-500">
            © {year} Eduvaris. Built for honest self-diagnosis.
          </p>
        </div>
        <p className="text-xs text-slate-500 max-w-md text-center md:text-right leading-relaxed">
          An independent study aid. Not affiliated with, endorsed by, or
          associated with any official English proficiency exam body.
        </p>
      </div>
    </footer>
  );
}
