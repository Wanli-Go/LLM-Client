import { useCallback, useRef, useState } from "react";
import classNames from "classnames";

type CodeBlocksType = Record<
  string,
  {
    lines: string;
    language: string;
    text: React.ReactNode[];
  }
>;

export interface CurrentCodeBlockInfo {
  currentBlockId: string;
  isActive: boolean;
  language: string;
  expectEmptyLine: boolean;
  lines: string;
  buffer: string;
  textBuffer: React.ReactNode[];
  lastBackTick: boolean;
}

export const useCodeBlock = (reduceMotion: boolean) => {
  const [codeBlocks, setCodeBlocks] = useState<CodeBlocksType>({});

  const currentBlockInfo = useRef<CurrentCodeBlockInfo>({
    currentBlockId: "",
    isActive: false,
    language: "",
    expectEmptyLine: false,
    lines: "",
    buffer: "",
    textBuffer: [],
    lastBackTick: false
  });

  const resetBlock = useCallback((lastBacktick?: boolean) => {
    currentBlockInfo.current.isActive = false;
    currentBlockInfo.current.language = "";
    currentBlockInfo.current.lines = "";
    currentBlockInfo.current.buffer = "";
    currentBlockInfo.current.textBuffer = [];
    currentBlockInfo.current.expectEmptyLine = false;
    currentBlockInfo.current.lastBackTick = false;
    if(lastBacktick) currentBlockInfo.current.lastBackTick = true;
  },[]);

  const flushCode = useCallback(() => {
    currentBlockInfo.current.lines += currentBlockInfo.current.buffer;
    setCodeBlocks((prev) => ({
      ...prev,
      [currentBlockInfo.current.currentBlockId]: {
        ...prev[currentBlockInfo.current.currentBlockId],
        lines: currentBlockInfo.current.lines,
        text: [],
      },
    }));
    currentBlockInfo.current.buffer = "";
    currentBlockInfo.current.textBuffer = [];
  },[]);

  const processCodeToken = useCallback((word: string) => {
    if (currentBlockInfo.current.expectEmptyLine) {
      currentBlockInfo.current.expectEmptyLine = false;
      return;
    }
    if (!currentBlockInfo.current.language) {
      currentBlockInfo.current.language = word;
      setCodeBlocks((prev) => ({
        ...prev,
        [currentBlockInfo.current.currentBlockId]: {
          ...prev[currentBlockInfo.current.currentBlockId],
          language: word,
        },
      }));
      currentBlockInfo.current.expectEmptyLine = true;
      return;
    }
    if (word.includes("\n")) {
      currentBlockInfo.current.buffer += word;
      flushCode();
      return;
    }
    // regular fade-in
    currentBlockInfo.current.buffer += word;
    currentBlockInfo.current.textBuffer.push(
      <span key={Date.now()} className={classNames({ "fade-in": !reduceMotion })}>{word}</span>
    );
    setCodeBlocks((prev) => ({
      ...prev,
      [currentBlockInfo.current.currentBlockId]: {
        ...prev[currentBlockInfo.current.currentBlockId],
        text: currentBlockInfo.current.textBuffer,
      },
    }));
  },[flushCode, reduceMotion]);

  return { codeBlocks, setCodeBlocks, currentBlockInfo, processCode: processCodeToken, resetBlock };
};