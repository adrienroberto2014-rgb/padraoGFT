import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_LOGO = "https://firebasestorage.googleapis.com/v0/b/ossmanager-7f1e5.appspot.com/o/logos%2Fdefault_logo.png?alt=media";

interface LogoProps {
  className?: string;
  settings?: any;
  size?: "sm" | "md" | "lg";
  customSrc?: string | null;
}

export const Logo = ({ className, settings, size = "md", customSrc }: LogoProps) => {
  const { gymInfo } = useAuth();
  const [error, setError] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Priority: customSrc > tenant branding > settings
  const logoUrl = customSrc || gymInfo?.config?.branding?.logoUrl || settings?.logoUrl;

  useEffect(() => {
    setError(false);
    setFallback(false);
    setIsLoaded(false);
  }, [logoUrl]);

  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-50 rounded-xl w-full h-full", className)}>
        <span className={cn(
          "font-serif font-bold text-black italic leading-none text-center tracking-tighter",
          size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-4xl"
        )}>
          GFTEAM
        </span>
      </div>
    );
  }

  const currentSrc = (fallback || !logoUrl) ? DEFAULT_LOGO : logoUrl;

  return (
    <div className={cn("relative w-full h-full flex items-center justify-center overflow-hidden min-w-[20px] min-h-[20px]", className)}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-50 animate-pulse rounded-xl" />
      )}
      <img 
        key={currentSrc}
        src={currentSrc} 
        alt="GFTEAM" 
        className={cn(
          "max-w-full max-h-full object-contain transition-all duration-700 ease-out",
          isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        referrerPolicy="no-referrer"
        loading="eager"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!fallback && logoUrl) {
            setFallback(true);
          } else {
            setError(true);
          }
        }}
      />
    </div>
  );
};
