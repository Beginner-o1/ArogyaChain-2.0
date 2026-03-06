import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function Card({ children, title, className = "" }: CardProps) {
  return (
    <div className={`pd-card ${className}`}>
      {title && (
        <div style={{ paddingBottom: "1rem", marginBottom: "0.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="pd-card-title">{title}</h3>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}