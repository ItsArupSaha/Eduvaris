/**
 * Footer: copyright + IELTS trademark disclaimer.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-amber-200/60 bg-amber-50">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          © {year} Eduvaris. Built for honest self-diagnosis.
        </p>
        <p className="text-xs text-slate-500 max-w-md text-center md:text-right leading-relaxed">
          IELTS® is a registered trademark of the University of Cambridge ESOL,
          the British Council, and IDP Australia. This product is an independent
          study aid and is not affiliated with, endorsed by, or associated with
          the IELTS partners.
        </p>
      </div>
    </footer>
  );
}
