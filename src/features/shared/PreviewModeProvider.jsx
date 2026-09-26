import { useEffect } from "react";
import { PreviewModeContext, setGlobalPreviewMode } from "./usePreviewMode";

/**
 * PreviewModeProvider: supplies isPreviewMode state to all nested dashboard components
 * and synchronizes the global write-protection flag.
 */
export default function PreviewModeProvider({
  isPreviewMode,
  previewRole,
  previewDivision,
  exitPreview,
  children,
}) {
  useEffect(() => {
    setGlobalPreviewMode(isPreviewMode);
    return () => {
      setGlobalPreviewMode(false);
    };
  }, [isPreviewMode]);

  return (
    <PreviewModeContext.Provider
      value={{
        isPreviewMode,
        previewRole,
        previewDivision,
        exitPreview,
      }}
    >
      {children}
    </PreviewModeContext.Provider>
  );
}
