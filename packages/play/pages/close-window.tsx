import { useEffect } from "react";

/**
 * This is the final step of the OAuth flow -
 * we've opened a new window to do the flow,
 * close that window when we're done.
 */
export default function CloseWindow() {
  useEffect(() => {
    window.close();
  });
  return null;
}
