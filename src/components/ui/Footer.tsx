export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`py-6 text-center text-sm text-gray-500 ${className}`}>
      <p>
        &copy; {new Date().getFullYear()}{" "}
        <a
          href="https://marcbd.site"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
        >
          Md Anisur Rahman Chowdhury
        </a>
        , Gannon University
      </p>
    </footer>
  );
}
