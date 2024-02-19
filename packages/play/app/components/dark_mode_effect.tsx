import { useCurrentUser } from "app/core/hooks/useCurrentUser";
import React, { Suspense, useEffect, memo } from "react";

export const DarkModeEffect = memo(function DarkModeEffect() {
  return (
    <Suspense fallback={null}>
      <DarkModeEffectInner />
    </Suspense>
  );
});

function DarkModeEffectInner() {
  const { darkMode } = useCurrentUser();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return null;
}
