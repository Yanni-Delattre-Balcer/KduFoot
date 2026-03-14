import React from "react";

import { parseJerseyColors } from "@/utils/colors";

interface JerseyColorDotsProps {
  colors: string | null | undefined;
  size?: "sm" | "md" | "lg";
}

export const JerseyColorDots: React.FC<JerseyColorDotsProps> = ({
  colors,
  size = "md",
}) => {
  const hexColors = parseJerseyColors(colors);

  if (hexColors.length === 0) return null;

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div className="flex -space-x-1.5 items-center">
      {hexColors.map((hex, idx) => (
        <div
          key={idx}
          className={`${sizeClasses[size]} rounded-full border border-white/20 shadow-sm`}
          style={{ backgroundColor: hex, zIndex: hexColors.length - idx }}
          title={colors || ""}
        />
      ))}
    </div>
  );
};

export default JerseyColorDots;
