/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { ReactNode } from 'react';

interface ScorePanelProps {
  badge?: ReactNode;
  infos?: ReactNode;
  orientation?: "horizontal" | "vertical";
}

const ScorePanel: React.FC<ScorePanelProps> = ({ badge, infos, orientation = "horizontal"}) => {
  return (
    <div className="w-full select-none flex flex-row justify-center">
      <div className={`flex flex-col gap-[28px] items-center`}>
          {badge}
        <div className={`flex flex-col gap-[10px] flex-col md:flex-${orientation ? "col": "row"} md:gap-[${orientation ? "10px": "40px"}] items-center`}>
          {infos}
        </div>
      </div>
    </div>
  );
};

export default ScorePanel;
