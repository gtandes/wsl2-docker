import React from "react";
import { cn } from "../utils/utils";

export interface DonutSlice {
  id: number;
  percent: number;
  color: string;
}

interface DonutSliceWithCommands extends DonutSlice {
  offset: number;
  commands: string;
}

class CalculusHelper {
  getSlicesWithCommandsAndOffsets(
    donutSlices: DonutSlice[],
    radius: number,
    svgSize: number,
    borderSize: number
  ): DonutSliceWithCommands[] {
    let previousPercent = 0;
    return donutSlices.map((slice) => {
      const modSlice = Object.assign(slice, {
        percent: slice.percent < 100 ? slice.percent : 99.99999,
      });
      const sliceWithCommands: DonutSliceWithCommands = {
        ...modSlice,
        commands: this.getSliceCommands(slice, radius, svgSize, borderSize),
        offset: previousPercent * 3.6 * -1,
      };
      previousPercent += slice.percent;
      return sliceWithCommands;
    });
  }

  getSliceCommands(
    donutSlice: DonutSlice,
    radius: number,
    svgSize: number,
    borderSize: number
  ): string {
    const degrees = this.percentToDegrees(donutSlice.percent);
    const longPathFlag = degrees > 180 ? 1 : 0;
    const innerRadius = radius - borderSize;

    const commands: string[] = [];
    commands.push(`M ${svgSize / 2 + radius} ${svgSize / 2}`);
    commands.push(
      `A ${radius} ${radius} 0 ${longPathFlag} 0 ${this.getCoordFromDegrees(
        degrees,
        radius,
        svgSize
      )}`
    );
    commands.push(
      `L ${this.getCoordFromDegrees(degrees, innerRadius, svgSize)}`
    );
    commands.push(
      `A ${innerRadius} ${innerRadius} 0 ${longPathFlag} 1 ${
        svgSize / 2 + innerRadius
      } ${svgSize / 2}`
    );
    return commands.join(" ");
  }

  getCoordFromDegrees(angle: number, radius: number, svgSize: number): string {
    const x = Math.cos((angle * Math.PI) / 180);
    const y = Math.sin((angle * Math.PI) / 180);
    const coordX = x * radius + svgSize / 2;
    const coordY = y * -radius + svgSize / 2;
    return [coordX, coordY].join(" ");
  }

  percentToDegrees(percent: number): number {
    return percent * 3.6;
  }
}

const DonutChart = ({
  data,
  radius,
  viewBox,
  borderSize,
  label,
  verticalLegends,
}: {
  data: DonutSlice[];
  radius: number;
  viewBox: number;
  borderSize: number;
  label?: React.ReactNode;
  verticalLegends?: boolean;
}) => {
  const helper = new CalculusHelper();
  return (
    data && (
      <>
        <svg
          viewBox={"0 0 " + viewBox + " " + viewBox}
          className={cn(
            "-ml-3 -mt-14 aspect-square h-[300px] origin-center overflow-visible",
            { "w-52 min-w-fit": verticalLegends }
          )}
        >
          {helper
            .getSlicesWithCommandsAndOffsets(data, radius, viewBox, borderSize)
            .map((slice, i) => (
              <path
                key={i}
                fill={slice.color}
                d={slice.commands}
                transform={"rotate(" + slice.offset + ") "}
                className="origin-center opacity-70 hover:opacity-100"
              ></path>
            ))}
        </svg>
        <div className="-mt-48 ml-24 w-20 text-center">{label}</div>
      </>
    )
  );
};

export default DonutChart;
