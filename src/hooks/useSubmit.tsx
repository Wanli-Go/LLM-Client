/* eslint-disable prefer-const */
import classNames from "classnames";
import { useRef, useCallback } from "react";
import { chatHistory, fetchChatResponse } from "../requests/fetchChatResponse";
import { useCodeBlock } from "./useCodeBlocks";
import OutputType from "../types/outputType";

/**
 * Trigger submit process, then receive streaming response while styling them
 */
const useChatSubmitAndStyle = ({input, setLoadingState, setEmptyContent, isUsingThinkingModelBuffered, 
    reduceMotion, setNewConversationFlag, setThinkingContent, setRawThinkingContent,
    setMainResponse, setRawMainResponse, setError}:{
        input: string,
        setLoadingState: React.Dispatch<React.SetStateAction<"SENT" | "THINKING" | "GENERATING" | "WAITING">>,
        setEmptyContent: ({ think, response }: { think?: boolean; response?: boolean }) => void,
        isUsingThinkingModelBuffered: boolean,
        reduceMotion: boolean,
        setNewConversationFlag: React.Dispatch<React.SetStateAction<boolean>>,
        setThinkingContent: React.Dispatch<React.SetStateAction<OutputType[]>>,
        setRawThinkingContent: React.Dispatch<React.SetStateAction<OutputType[]>>,
        setMainResponse: React.Dispatch<React.SetStateAction<OutputType[]>>,
        setRawMainResponse: React.Dispatch<React.SetStateAction<OutputType[]>>,
        setError: React.Dispatch<React.SetStateAction<string>>
    }
  ) => {
    const abortController = useRef(new AbortController());
    const { setCodeBlocks, currentBlockInfo, processCode, resetBlock } = useCodeBlock(reduceMotion);

    const styleFilter = useCallback((
      content: string, 
      key: number, 
      {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord}: {
        nextTitleFlag: number,
        nextBoldText: boolean,
        nextBacktickedText: boolean,
        newlineFlag: boolean,
        trimNextWord: boolean
    }): [OutputType, {
      nextTitleFlag: number,
      nextBoldText: boolean,
      nextBacktickedText: boolean,
      newlineFlag: boolean,
      trimNextWord: boolean
  }] => {
      if (trimNextWord) {
        trimNextWord = false;
        content = content.trim();
      }
      if (content.includes('```')) {
        if (currentBlockInfo.current.isActive) {
          resetBlock();
          return [null, {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord}];
        }
        currentBlockInfo.current.isActive = true;
        const newBlockId = Math.random().toString(36).substring(7);
        currentBlockInfo.current.currentBlockId = newBlockId;
        setCodeBlocks((prev) => ({
          ...prev,
          [newBlockId]: {
            lines: "",
            language: "",
            text: [],
          },
        }));
        return [{ type: "code", id: newBlockId }, {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord}];
      }
      if (content.includes('``') && currentBlockInfo.current.isActive) {
        resetBlock(true);
        return [null, {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord}];
      }
      if (currentBlockInfo.current.lastBackTick && content.includes('`')) {
        currentBlockInfo.current.lastBackTick = false;
        return ['\n', {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord}];
      }
      if (currentBlockInfo.current.isActive) {
        processCode(content);
        return [null, {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord}];
      }

      const localTitleFlag = nextTitleFlag;
      let localBoldText = nextBoldText;
      let localBacktickedText = nextBacktickedText;
      if (content.includes('`')) {
        nextBacktickedText = !localBacktickedText;
        if (!nextBacktickedText && content.startsWith('`')) localBacktickedText = false;
        content = content.replace("`", "");
      }
      if (!localBacktickedText) {
        if (content.includes("-") && newlineFlag) {
          return [{ type: 'text', content: <span className="pi pi-angle-right" style={{ fontSize: '12px', lineHeight: '24px' }}></span> }, {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord}]
        }
        if (content.startsWith("#")) {
          nextTitleFlag = Math.min(Math.max(content.split("").length, 1), 3);
          trimNextWord = true;
          return [null, {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord}];
        }
        if (content.includes("**")) {
          nextBoldText = !localBoldText;
          if (!nextBoldText && content.startsWith('**')) localBoldText = false;
          content = content.replace("**", "");
        }
      }
      newlineFlag = false;
      if (content.includes("\n")) {
        nextTitleFlag = 0;
        nextBoldText = false;
        newlineFlag = true;
      }

      return [{
        type: "text",
        content: (
          <span
            className={classNames({
              "fade-in": !reduceMotion,
              "text-xl": localTitleFlag === 3,
              "text-2xl": localTitleFlag === 2,
              "text-3xl": localTitleFlag === 1,
              "font-bold": localTitleFlag > 0 || localBoldText,
              "font-mono": localBacktickedText,
              "text-amber-100": localBacktickedText
            })}
            key={key}
          >
            {content}
          </span>
        ),
      }, {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord}]
    }, [currentBlockInfo, reduceMotion, setCodeBlocks, resetBlock, processCode]);

    const handleSubmit = useCallback(async ({regen} : {regen?: boolean}) => {
      if (!input.trim()) return;
      if (regen) chatHistory.splice(-2, 2);

      abortController.current = new AbortController();
      setLoadingState("SENT");

      let localThinking = false;
      let firstResponseToken = true;
      let nextTitleFlag = 0;
      let nextBoldText = false;
      let nextBacktickedText = false;
      let newlineFlag = false;
      let trimNextWord = false;

      try {
        const response: ReadableStreamDefaultReader = await fetchChatResponse(input, isUsingThinkingModelBuffered, abortController.current.signal);
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await response.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              const rawContent: string = data.message.content
                .replace(/\\u003c/g, "<")
                .replace(/\\u003e/g, ">");

              // read thinking tags
              if (rawContent === "<think>") {
                setLoadingState("THINKING");
                localThinking = true;
                continue;
              }
              if (rawContent === "</think>") {
                setLoadingState("GENERATING");
                localThinking = false;
                firstResponseToken = true;
                continue;
              }

              if (firstResponseToken) {
                firstResponseToken = false;
                if (!isUsingThinkingModelBuffered) {
                  setLoadingState('GENERATING');
                  setEmptyContent({ think: true, response: true });
                  setNewConversationFlag(false);
                }
                else continue;
              }

              // style the output              
              let styledContent: OutputType;
              [styledContent, { nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord }] = styleFilter(rawContent, 0, {nextTitleFlag, nextBoldText, nextBacktickedText, newlineFlag, trimNextWord});

              if (localThinking) {
                setThinkingContent((prev) => [...prev, styledContent]);
                setRawThinkingContent((prev) => [...prev, rawContent]);
              } else {
                setMainResponse((prev) => [...prev, styledContent]);
                setRawMainResponse((prev) => [...prev, rawContent]);
              }
            } catch (err) {
              console.error("Error parsing chunk:", err);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "请求失败");
      } finally {
        setLoadingState("WAITING");
      }
    }, [input, setLoadingState, isUsingThinkingModelBuffered, styleFilter, setEmptyContent, setNewConversationFlag, setThinkingContent, setRawThinkingContent, setMainResponse, setRawMainResponse, setError]);

    return { handleSubmit, abort: () => abortController.current.abort() };
  };

  export default useChatSubmitAndStyle;