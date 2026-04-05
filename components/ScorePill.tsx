/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { ReactNode } from "react";

interface ScorePillProps {
  children?: ReactNode;
  className?: string;
}

const ScorePill: React.FC<ScorePillProps> = ({ children, className }) => {
  return (
    <div
      className={`w-full select-none flex flex-row justify-center items-center rounded-full rainbow-border animate-rotate-gradient px-[22px] py-3.5 text-base lg:text-lg font-medium text-white leading-none ${className}`}
    >
      <div className="flex justify-center items-center gap-1.5 shrink-0 whitespace-nowrap">
        {React.Children.toArray(children).map((child, index, array) => (
          <React.Fragment key={index}>
            {child}
            {index < array.length - 1 && <span className="text-[16px] md:text-[18px]">—</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ScorePill;
