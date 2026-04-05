/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { ReactNode, ComponentType, CSSProperties } from "react";

interface ScoreIconProps {
  children: ReactNode;
  color?: string;
  className?: string;
  icon: ComponentType<{ style?: CSSProperties; className?: string }>;
}

const typography = "text-[18px] font-medium text-white tracking-[-0.36px] leading-[1.6]";

const ScoreIcon = ({ children, color="#4275F4", className="", icon: Icon }: ScoreIconProps) => {
    return (
        <div
          className={`flex flex-row text-center items-center gap-[6px] ${className}`}
          style={{ color: color }}
        >
        <Icon className="w-5 h-5" />
        <div className={`flex flex-row gap-[6px] ${typography}`}>
          {children}
        </div>
        </div>
  );
};

export default ScoreIcon;
