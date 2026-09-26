import { createContext, useContext } from "react";

export const PreviewModeContext = createContext({
  isPreviewMode: false,
  previewRole: null,
  previewDivision: null,
  exitPreview: () => {},
});

let _globalIsPreviewMode = false;

export function setGlobalPreviewMode(active) {
  _globalIsPreviewMode = Boolean(active);
}

export function getIsPreviewMode() {
  return _globalIsPreviewMode;
}

export function usePreviewMode() {
  return useContext(PreviewModeContext);
}

/**
 * Returns disabled props if currently in UI Preview Mode.
 * Components can spread this onto action/submit buttons:
 * <button {...previewDisabledProps("Submissions are disabled in Preview Mode")} ...>
 */
export function previewDisabledProps(customTitle) {
  if (!_globalIsPreviewMode) return {};
  return {
    disabled: true,
    title: customTitle || "Disabled in preview mode",
    "aria-disabled": "true",
  };
}
