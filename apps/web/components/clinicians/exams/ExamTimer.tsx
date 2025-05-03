import { useState, useEffect, memo, useCallback, useRef } from "react";
import { directus } from "../../../utils/directus";
import clsx from "clsx";
import { match, P } from "ts-pattern";

interface TimerProps {
  assignmentId: string;
  onTimeUp: () => void;
}

type TimerColors = "gray" | "green" | "yellow" | "red";

const ExamTimer: React.FC<TimerProps> = ({ assignmentId, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [color, setColor] = useState<TimerColors>("gray");
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleMessage = (message: string) => {
    try {
      const data = JSON.parse(message.substring(5));

      if (data.timeLeft !== undefined) {
        setTimeLeft(data.timeLeft - 1);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };

  const cleanupSSE = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {});
      readerRef.current = null;
    }
  }, []);

  const startSSE = useCallback(async () => {
    cleanupSSE();
    try {
      abortControllerRef.current = new AbortController();
      const token = await directus.auth.token;
      const response = await fetch(
        `/api/v1/exams/exam-timer?assignment_id=${assignmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) throw new Error("Failed to start SSE connection.");
      if (!response.body)
        throw new Error("No response body found for SSE connection.");

      const body = response.body;
      const reader = body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value: chunk, done } = await reader.read();

        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        if (done) break;

        buffer += decoder.decode(chunk, { stream: true });
        const messages = buffer.split("\n").filter(Boolean);
        buffer = messages.pop() || "";

        if (buffer) {
          handleMessage(buffer);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error in SSE connection:", error);
        setTimeout(() => {
          if (!abortControllerRef.current?.signal.aborted) {
            startSSE();
          }
        }, 5000);
      }
    }
  }, [assignmentId, cleanupSSE]);

  useEffect(() => {
    startSSE();
    return () => {
      if (readerRef.current) {
        readerRef.current.cancel().catch(console.error);
        readerRef.current = null;
      }
    };
  }, [assignmentId, startSSE]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0) {
      onTimeUp();
    }
  }, [timeLeft, onTimeUp]);

  useEffect(() => {
    if (timeLeft !== null) {
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);

      const newColor = match(true)
        .when(
          () => hours > 0,
          () => "green" as TimerColors
        )
        .when(
          () => minutes < 5,
          () => "red" as TimerColors
        )
        .when(
          () => minutes < 15,
          () => "yellow" as TimerColors
        )
        .otherwise(() => "green" as TimerColors);

      setColor(newColor);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

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
      {timeLeft ? (
        <p className="text-left">{formatTime(timeLeft)}</p>
      ) : (
        <p className="w-full text-center">...</p>
      )}
    </div>
  );
};

export default memo(ExamTimer);
