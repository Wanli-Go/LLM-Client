
import { useEffect, useRef, useState } from "react";
import * as _ from "radashi";
import OutputType from "../types/outputType";

/**
 * UI Refs for styling components inside `thinking-wrapper`. This is a bit hacky, but it works.
 * Mainly responsible for the resizing of thinking-background to cover all thinking texts.
 */

const useThinkingStyles = ({
  showThinking,
  reduceMotion,
  language,
  thinkingContent,
  isUsingThinkingModelBuffered,
  isRawMode,
}: {
  showThinking: boolean;
  reduceMotion: boolean;
  language: string;
  thinkingContent: OutputType[];
  isUsingThinkingModelBuffered: boolean;
  isRawMode: boolean;
}) => {
  const [resizeFlag, setResizeFlag] = useState(false);
  const handleResize = _.throttle({ interval: 200 }, () => {
    setResizeFlag(true);
    setTimeout(() => setResizeFlag(false), 150);
  });

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const thinkingBackgroundRef = useRef<HTMLDivElement>(null);
  const thinkingContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const contentHeight = thinkingContentRef.current?.scrollHeight ?? 0;
    const contentWidth = thinkingContentRef.current?.scrollWidth ?? 0;
    if (showThinking) {
      if (thinkingBackgroundRef.current && thinkingContentRef.current) {
        if (resizeFlag || reduceMotion) {
          thinkingBackgroundRef.current.classList.add("reduce-motion");
        } else {
          thinkingBackgroundRef.current.classList.remove("reduce-motion");
        }
        thinkingBackgroundRef.current.style.height = `${contentHeight + 40}px`;
        thinkingBackgroundRef.current.style.width = `${contentWidth}px`;
        thinkingContentRef.current.style.opacity = "1";
        thinkingContentRef.current.style.zIndex = "10";
        if (!reduceMotion)
          thinkingContentRef.current.classList.add("mask-animation-bottom");
        if (
          !thinkingBackgroundRef.current.classList.contains("completed")
        )
          requestAnimationFrame(() =>
            thinkingBackgroundRef.current?.classList.add("completed")
          );
      }
    } else if (
      !showThinking &&
      thinkingBackgroundRef.current &&
      thinkingContentRef.current
    ) {
      if (reduceMotion) {
        thinkingBackgroundRef.current.classList.add("reduce-motion");
      } else {
        thinkingBackgroundRef.current.classList.remove("reduce-motion");
      }
      thinkingBackgroundRef.current.style.height = `48px`;
      thinkingBackgroundRef.current.style.width =
        language === "en" ? `184px` : `136px`;
      thinkingContentRef.current.style.opacity = "0";
      thinkingContentRef.current.style.zIndex = "-10";
      if (!reduceMotion)
        thinkingContentRef.current.classList.remove("mask-animation-bottom");
      if (
        thinkingBackgroundRef.current.classList.contains("completed")
      )
        thinkingBackgroundRef.current?.classList.remove("completed");
    }
  }, [
    language,
    showThinking,
    thinkingContent,
    resizeFlag,
    reduceMotion,
    isUsingThinkingModelBuffered,
    isRawMode,
  ]);

  return { thinkingBackgroundRef, thinkingContentRef };
};

export default useThinkingStyles;