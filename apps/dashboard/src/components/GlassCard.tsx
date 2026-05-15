import clsx from "clsx";

interface Props {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export default function GlassCard({ children, className, glow }: Props) {
  return (
    <div className={clsx("glass-card p-5", glow && "glow-purple", className)}>
      {children}
    </div>
  );
}
