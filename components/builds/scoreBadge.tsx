/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { ReactNode, ComponentType, CSSProperties } from "react";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  color?: string;
  icon?: ComponentType<{ style?: CSSProperties; className?: string }>;
  mode?: "dark" | "light";
}

const ScoreBadge = ({ children, className="", color = "#4275F4", mode="dark", icon: Icon }: BadgeProps) => {
  return (
    <div
      className={`flex flex-row items-center justify-center p-3 rounded-full flex-grow-0 w-fit items-center gap-[6px] min-w-[160px] ${className}`}
      style={{
        backgroundColor: color
      }}
    >
      {Icon && (
        <Icon
          className="w-5 h-5"
          style={{ color: mode === "dark" ? "#FFFFFF" : "#000000" }}
        />
      )}
      <span
        className="font-medium leading-tight text-trim-both"
        style={{ color: mode === "dark" ? "#FFFFFF" : "#000000" }}
      >
        {children}
      </span>
    </div>
  );
};

export default ScoreBadge;
