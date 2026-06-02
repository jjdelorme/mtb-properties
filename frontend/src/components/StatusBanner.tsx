import { AlertCircle } from 'lucide-react';

interface StatusBannerProps {
  message: string;
}

export default function StatusBanner({ message }: StatusBannerProps) {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-amber-800 flex items-center gap-2 text-xs font-semibold shrink-0 shadow-sm w-full animate-pulse">
      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
