declare module "react-progressbar-semicircle" {
  import * as React from "react";
  export interface ProgressbarSemicircleProps {
    stroke?: string;
    strokeWidth?: number;
    background?: string;
    diameter?: number;
    orientation?: string;
    direction?: string;
    percentage: number;
    showPercentValue?: boolean;
  }
  let ProgressbarSemicircle: React.ComponentClass<ProgressbarSemicircleProps>;
  export default ProgressbarSemicircle;
}
