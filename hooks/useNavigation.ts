/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { NavigateTo, Page } from "../types";
import { getPath } from "../utils/path";

/**
 * Navigation hook for consistent routing across the application
 * Handles navigation to different pages with proper URL generation
 */
export const useNavigation = (): { navigateTo: NavigateTo } => {
  const navigateTo: NavigateTo = (page: Page, identifier?: string) => {
    // Guard against SSR
    if (typeof window === "undefined") {
      return;
    }

    if (page === "landing") {
      window.location.href = getPath("/");
      return;
    }

    if (page === "puzzle" && typeof identifier === "string") {
      const buildPath = `build/${identifier}/`;
      window.location.href = getPath(buildPath);
      return;
    }

    if (page === "hidden-build" && typeof identifier === "string") {
      const buildPath = `hidden-build/${identifier}/`;
      window.location.href = getPath(buildPath);
      return;
    }

    if (page === "bundles-completed") {
      window.location.href = getPath("/bundles-completed/");
      return;
    }

    if (page === "remix" && typeof identifier === "string") {
      const remixPath = `remix/${identifier}/`;
      window.location.href = getPath(remixPath);
      return;
    }

    window.location.href = getPath(`${page}/`);
  };

  return { navigateTo };
};
