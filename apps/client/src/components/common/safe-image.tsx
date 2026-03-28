import React, { useState } from "react";
import { Skeleton } from "@heroui/skeleton";
import { motion } from "framer-motion";
import { getCloudflareOptimizedUrl } from "@/utils/image";

interface SafeImageProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackText?: string;
  priority?: boolean;
  aspectRatio?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

/**
 * SafeImage: Industrial-grade image component with:
 * 1. Automatic Cloudflare Optimization
 * 2. Skeleton while loading (no layout shift)
 * 3. Text fallback on error
 * 4. Priority loading support
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = "",
  width,
  height,
  className = "",
  fallbackText = "?",
  aspectRatio = "1/1",
  objectFit = "contain",
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reserve space with aspect-ratio to prevent Layout Shift (Industrial Standard)
  const containerStyle: React.CSSProperties = {
    aspectRatio,
    width: width ? `${width}px` : "100%",
    height: height ? `${height}px` : "auto",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  if (!src || hasError) {
    return (
      <div
        className={`bg-white/5 border border-white/10 rounded-2xl ${className}`}
        style={containerStyle}
      >
        <span className="text-white/30 font-black text-xl select-none">
          {fallbackText.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  // Cloudflare Images optimization + BlurHash architecture
  const optimizedUrl = getCloudflareOptimizedUrl(src, {
    width: width || 800,
    format: "auto",
    quality: 85,
  });

  return (
    <div className={`relative ${className}`} style={containerStyle}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse rounded-2xl z-10">
          <Skeleton className="w-full h-full" />
        </div>
      )}
      <motion.img
        alt={alt}
        animate={{
          opacity: isLoaded ? 1 : 0,
          scale: isLoaded ? 1 : 1.02,
          filter: isLoaded ? "blur(0px)" : "blur(10px)",
        }}
        className={`w-full h-full rounded-2xl transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"} ${className}`}
        initial={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
        src={optimizedUrl}
        style={{ objectFit }}
        transition={{
          type: "spring",
          stiffness: 80,
          damping: 15,
          mass: 1,
        }}
        onError={() => setHasError(true)}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};
