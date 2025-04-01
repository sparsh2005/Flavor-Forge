import { Link } from "wouter";
import { LucideIcon } from "lucide-react";

interface CategoryItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
}

export function CategoryItem({ icon: Icon, label, href }: CategoryItemProps) {
  return (
    <Link href={href}>
      <a className="flex flex-col items-center p-4 rounded-lg bg-neutral-50 hover:bg-primary/10 transition-all">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Icon className="text-primary h-6 w-6" />
        </div>
        <span className="font-medium text-gray-800">{label}</span>
      </a>
    </Link>
  );
}
