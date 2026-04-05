/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export function getPath(path: string) {
  const cleanPath = path.replace('media/', '');
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `https://www.gstatic.com/aistudio/starter-apps/applets-io${normalizedPath}`
}