import { intervalToDuration } from "date-fns";
import React, { useEffect, useState, useCallback, useRef } from "react";
import clsx from "clsx";
import { match } from "ts-pattern";

const zeroPad = (num: number | undefined) => String(num ?? 0).padStart(2, "0");

interface Props {
  due: Date;
  onTimeUp?: () => void;
}

type TimerColors = "gray" | "green" | "yellow" | "red";

export const Timer: React.FC<Props> = ({ due, onTimeUp }) => {
  const [duration, setDuration] = useState("");
  const [color, setColor] = useState<TimerColors>("gray");
  const [serverTimeOffset, setServerTimeOffset] = useState<number | null>(null);
  const hasCalledOnTimeUp = useRef(false);
  const initialClientTime = useRef<number>(performance.now());

  useEffect(() => {
    const fetchServerTime = async () => {
      try {
        const fetchStartTime = performance.now();
        const response = await fetch(`/api/v1/exams/server-time`);
        const { epoch } = await response.json();
        const fetchEndTime = performance.now();

        const networkLatency = fetchEndTime - fetchStartTime;
        const clientTimeAtResponse =
          initialClientTime.current +
          ((fetchStartTime + fetchEndTime) / 2 - initialClientTime.current);

        const offset = epoch - clientTimeAtResponse;
        setServerTimeOffset(offset);
      } catch (error) {
        console.error("Failed to fetch server time", error);
      }
    };

    fetchServerTime();
  }, []);

  const getServerAdjustedTime = useCallback(() => {
    if (serverTimeOffset === null) return null;
    return performance.now() + serverTimeOffset;
  }, [serverTimeOffset]);

  useEffect(() => {
    if (!due || serverTimeOffset === null) return;

    const updateTimer = () => {
      const now = getServerAdjustedTime();
      if (now === null) return;

      const dueTime = due.getTime();

      if (now >= dueTime) {
        if (!hasCalledOnTimeUp.current) {
          hasCalledOnTimeUp.current = true;
          onTimeUp && onTimeUp();
        }
        return;
      }

      try {
        const diffMs = dueTime - now;

        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);

        const formatted = [hours, minutes, seconds].map(zeroPad).join(":");

        let newColor: TimerColors;
        if (hours > 0) newColor = "green";
        else if (minutes < 5) newColor = "red";
        else if (minutes < 15) newColor = "yellow";
        else newColor = "green";

        setColor(newColor);
        setDuration(formatted);
      } catch (error) {
        console.error("Error calculating duration:", error);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [due, onTimeUp, getServerAdjustedTime, serverTimeOffset]);

  const currentTime = getServerAdjustedTime();
  if (!due || currentTime === null || currentTime >= due.getTime()) return null;

  return (
    <div
      className={clsx(
        "flex h-[36px] w-[100px] items-center rounded-md px-4 font-medium text-white",
        match(color)
          .with("gray", () => "bg-gray-400")
          .with("green", () => "bg-green-500")
          .with("yellow", () => "bg-yellow-500")
          .with("red", () => "bg-red-500")
          .exhaustive()
      )}
    >
      {duration ? (
        <p className="text-left">{duration}</p>
      ) : (
        <p className="w-full text-center">...</p>
      )}
    </div>
  );
};
