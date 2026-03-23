import Link from "next/link";

export function Logo({ size = "md", link = true }: { size?: "sm" | "md" | "lg"; link?: boolean }) {
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };
  const inner = (
    <span className="flex items-center gap-2 select-none">
      <span className={`${sizes[size]} font-extrabold tracking-tight`}>
        <span className="gradient-text">Fit</span>
        <span className="text-gray-800">Life</span>
      </span>
    </span>
  );
  if (!link) return inner;
  return <Link href="/dashboard" className="flex items-center gap-2">{inner}</Link>;
}
