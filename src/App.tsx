import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import BreadcrumbIcon from "./assets/svg/breadcrumb";
import classNames from "classnames";
import Setting from "./components/Setting";
import * as _ from "radashi";
import useSettings from "./hooks/useSettings";
import CodeBlock from "./components/ChatView/CodeBlock";
import { useCodeBlock } from "./hooks/useCodeBlocks";
import SubmitButton from "./components/ChatView/SubmitButton";
import {chatHistory, fetchChatResponse} from "./requests/fetchChatResponse";
import { animation } from "./utils/scrolldown-animation.js";

function App() {

  // basic states
  const [newConversationFlag, setNewConversationFlag] = useState(true);
  const [input, setInput] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const [loadingState, setLoadingState] = useState<
    "SENT" | "THINKING" | "GENERATING" | "WAITING"
  >("WAITING");

  // settings hooks
  const {
    language,
    setLanguage,
    reduceMotion,
    setReduceMotion,
    isRawMode,
    setIsRawMode,
    isUsingThinkingModel,
    setIsUsingThinkingModel,
    isUsingThinkingModelBuffered
  } = useSettings(loadingState);

  const [error, setError] = useState("");
  type OutputType = 
    { type: "text"; content: React.ReactNode } // styled text
    | { type: "code"; id: string } // code block placeholder, will render as CodeBlock
    | string // raw text (optional)
    | null; // for safety
  
  // response output
  const [thinkingContent, setThinkingContent] = useState<OutputType[]>([]);
  const [rawThinkingContent, setRawThinkingContent] = useState<OutputType[]>([]);
  const [mainResponse, setMainResponse] = useState<OutputType[]>([]);
  const [rawMainResponse, setRawMainResponse] = useState<OutputType[]>([]);

  const setEmptyContent = useCallback(({think, response} : {think?: boolean, response?: boolean}) => {
    if (think) {
      setThinkingContent([]);
      setRawThinkingContent([]);
    }
    if (response) {
      setMainResponse([]);
      setRawMainResponse([]);
    }
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const setDefaultThinkingContentRef = useRef<Function>(undefined);
  useEffect(() => {
    setDefaultThinkingContentRef.current = () => {
      setThinkingContent([language === 'zh' ? '[无思考内容]' : '[No Thinking Content]']);
      setRawThinkingContent([language === 'zh' ? '[无思考内容]' : '[No Thinking Content]']);
    };
  }, [language]);

  /**
   * auto-scroll
  */ 
  const scrollRef = useRef<HTMLDivElement>(null);
  const isGluedToButtom = useRef(true);
  useEffect(()=>{ // auto-scroll
    const scrollDom = scrollRef.current;
    if(scrollDom) {
      const target = scrollDom.scrollHeight - scrollDom.clientHeight;
      if( isGluedToButtom.current )animation(scrollDom, target);
      if( target - scrollDom.scrollTop < 10) {
        isGluedToButtom.current = true;
      }
      if ( target - scrollDom.scrollTop > 36) {
        isGluedToButtom.current = false;
      }
    }
  },[rawMainResponse.length, rawThinkingContent.length]);
  useEffect(()=>{
    document.addEventListener('scrolledUp', ()=>{
      isGluedToButtom.current = false;
    })
  }, []);
  
  // for focusing
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tabIndexAnchorRef = useRef<HTMLDivElement>(null);

  /**
   * When loadingState changes
   */
  const isUsingThinkingModelBufferedRef = useRef(isUsingThinkingModelBuffered);
  isUsingThinkingModelBufferedRef.current = isUsingThinkingModelBuffered;
  useEffect(()=>{ // when loading state changes
    if (loadingState === 'WAITING') {
      if(newConversationFlag)inputRef.current?.focus();
      else {
        tabIndexAnchorRef.current?.focus();
        if(!error){
          chatHistory.push({role: 'user', content: input});
          chatHistory.push({role: 'assistant', content: ([...rawMainResponse] as string[]).join('')});          
        }
      }
    }
    if (loadingState === 'SENT') {
      setError("");
      if(newConversationFlag) setEmptyContent({think: true, response: true});
    }
    else if(loadingState === 'THINKING') {
      setEmptyContent({think: true, response: true});
      setNewConversationFlag(false);
      setTimeout(()=>setShowThinking(true), 500);
    }
    else if (loadingState === 'GENERATING' && isUsingThinkingModelBufferedRef.current) { // when not using thinking model, bypass useEffect
      setEmptyContent({response: true});
      setThinkingContent((prev) => {
        if (prev.length < 10) {
          requestAnimationFrame(()=>setDefaultThinkingContentRef.current?.());
        }
        return prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingState, inputRef, isUsingThinkingModelBufferedRef, newConversationFlag, setEmptyContent]);

  // code block hooks
  const { codeBlocks, setCodeBlocks, currentBlockInfo, processCode, resetBlock } = useCodeBlock(reduceMotion);

  /**
   * render OutputType[] to HTML or text or code blocks
   */
  const renderOutput = (content: OutputType[]) => {
    return content.map((part) => {
      if (!part) return;
      if (typeof part === "string") {
        return part;
      }
      if (part.type === "text") {
        return part.content;
      }
      const block = codeBlocks[part.id];
      return (
        <CodeBlock
          key={part.id}
          code={block.lines}
          text={block.text}
          language={block.language}
        />
      );
    })
  }


  /**
   * UI Refs for styling components inside `thinking-wrapper`. This is a bit hacky, but it works.
   * Mainly responsible for the resizing of thinking-background to cover all thinking texts.
   */
  const [resizeFlag, setResizeFlag] = useState(false);
  const handleResize = _.throttle({ interval: 200 }, () => {
    setResizeFlag(true);
    setTimeout(() => setResizeFlag(false), 150);
  });
  useEffect(()=>{
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  },[handleResize]);
  const thinkingBackgroundRef = useRef<HTMLDivElement>(null);
  const thinkingContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const contentHeight = thinkingContentRef.current?.scrollHeight ?? 0;
    const contentWidth = thinkingContentRef.current?.scrollWidth ?? 0;
    if (showThinking) {
      // Style changes after you show thinking content: expanding background to wrap content
      if (thinkingBackgroundRef.current && thinkingContentRef.current) {
        if (resizeFlag || reduceMotion ) {
          thinkingBackgroundRef.current.classList.add("reduce-motion");
        } else {
          thinkingBackgroundRef.current.classList.remove("reduce-motion");
        }
        thinkingBackgroundRef.current.style.height = `${contentHeight + 40}px`;
        thinkingBackgroundRef.current.style.width = `${contentWidth}px`;
        thinkingContentRef.current.style.opacity = "1";
        thinkingContentRef.current.style.zIndex = "10";
        if(!reduceMotion) thinkingContentRef.current.classList.add("mask-animation-bottom"); // dropdown effect
        if(!thinkingBackgroundRef.current.classList.contains('completed')) requestAnimationFrame(()=>thinkingBackgroundRef.current?.classList.add('completed'))
      }
    } else if (!showThinking && thinkingBackgroundRef.current && thinkingContentRef.current) {
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
      if(!reduceMotion) thinkingContentRef.current.classList.remove("mask-animation-bottom");
      if(thinkingBackgroundRef.current.classList.contains('completed')) thinkingBackgroundRef.current?.classList.remove('completed');
    }
  }, [language, showThinking, thinkingContent, resizeFlag, reduceMotion, isUsingThinkingModelBuffered, isRawMode]);

  const abortController = useRef(new AbortController());
  const abort = () => {
    abortController.current.abort();
    setLoadingState('WAITING');
  };

  /**
   * Trigger submit process, then receive streaming response while styling them
   */
  const handleSubmit = useCallback(async (e?: React.FormEvent<HTMLFormElement>, regen?: boolean) => {
    e?.preventDefault();
    if (!input.trim()) return;
    if(regen) chatHistory.splice(-2, 2);

    abortController.current = new AbortController();
    setLoadingState("SENT");

    // Local variables for stream processing
    let localThinking = false; //避免函数闭包访问不到state的问题
    let firstResponseToken = true; //第一个响应token必定是回车，去除
    let nextTitleFlag = 0; // 0: normal, 1: title, 2: subtitle, 3: subsubtitle.
    let nextBoldText = false;
    let nextBacktickedText = false;
    let newlineFlag = false;
    let trimNextWord = false;

    /** 
     * Each word goes through this filter to determine its style 
     */
    const styleFilter = (
      word: string,
      key: number
    ): OutputType => {
      if (trimNextWord) {
        trimNextWord = false;
        word = word.trim();
      }
      // Start a code block
      if (word.includes('```')) {
        if(currentBlockInfo.current.isActive) {
          resetBlock();
          return null;
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
        return { type: "code", id: newBlockId };
      }
      // End a code block alternatively
      if (word.includes('``') && currentBlockInfo.current.isActive) {
          resetBlock(true);
          return null;
      }
      if (currentBlockInfo.current.lastBackTick && word.includes('`')) {
        currentBlockInfo.current.lastBackTick = false;
        return '\n';
      }
      // Process code block content
      if (currentBlockInfo.current.isActive) {
        processCode(word);
        return null;
      }

      const localTitleFlag = nextTitleFlag;
      let localBoldText = nextBoldText;
      let localBacktickedText = nextBacktickedText;
      if (word.includes('`')) {
        nextBacktickedText = !localBacktickedText;
        if(!nextBacktickedText && word.startsWith('`')) localBacktickedText = false;
        word = word.replace("`", "");
      }
      if (!localBacktickedText) {
        if (word.includes("-") && newlineFlag) {
          return {type: 'text', content: <span className="pi pi-angle-right" style={{ fontSize: '12px', lineHeight: '24px' }}></span>}
        }
        if (word.startsWith("#")) {
          nextTitleFlag = Math.min(Math.max(word.split("").length, 1), 3);
          trimNextWord = true;
          return null;
        }
        if (word.includes("**")) {
          nextBoldText = !localBoldText;
          if(!nextBoldText && word.startsWith('**')) localBoldText = false;
          word = word.replace("**", "");
        }
      }
      newlineFlag = false;
      if (word.includes("\n")) {
        nextTitleFlag = 0;
        nextBoldText = false;
        newlineFlag = true;
      }

      return {
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
            {word}
          </span>
        ),
      };
    };

    /**
     * API Call
     */
    try {
      const response: ReadableStreamDefaultReader = await fetchChatResponse(input, isUsingThinkingModelBuffered, abortController.current.signal);// Directly read the response body as a stream
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await response.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            const content: string = data.message.content
              .replace(/\\u003c/g, "<")
              .replace(/\\u003e/g, ">");
            
            // Handle thinking tags
            if (content === "<think>") {
              setLoadingState("THINKING");
              localThinking = true;
              continue;
            }
            if (content === "</think>") {
              setLoadingState("GENERATING");
              localThinking = false;
              firstResponseToken = true;
              continue;
            }
            // 根据当前状态分发内容
            if (firstResponseToken) {
              if(!isUsingThinkingModelBuffered) {
                setLoadingState('GENERATING');
                setEmptyContent({think: true, response: true});
                setNewConversationFlag(false);
              }
              firstResponseToken = false; 
              if(isUsingThinkingModelBuffered) continue;
            }
            if (localThinking) {
              setThinkingContent((prev) => [...prev, styleFilter(content, prev.length)]);
              setRawThinkingContent((prev) => [...prev, content]);
            } else {
              setMainResponse((prev) => [...prev, styleFilter(content, prev.length)]);
              setRawMainResponse((prev) => [...prev, content]);
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
  }, [input, currentBlockInfo, reduceMotion, setCodeBlocks, resetBlock, processCode, isUsingThinkingModelBuffered, setEmptyContent]);

  return (
    <div ref={scrollRef} className="h-screen w-screen overflow-auto bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 p-4 md:p-8" style={{scrollbarGutter: 'stable'}}>
      {/** All visible content should be in main-content area.
       * Includes: setting, title, padding, input form, error area, response area.
       * */}
      <div className="main-content relative w-full mx-auto space-y-6 flex flex-col justify-center items-center">
        {/** setting anchored top-right of the screen */}
        <Setting
          reduceMotion={reduceMotion}
          setReduceMotion={setReduceMotion}
          isUsingThinkingModel={isUsingThinkingModel}
          setIsUsingThinkingModel={setIsUsingThinkingModel}
          language={language}
          setLanguage={setLanguage}
          isRawMode={isRawMode}
          setIsRawMode={setIsRawMode}
        />

        {/** title */}
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          {language === "zh" ? "大模型小助手" : "LLM Client"}
        </h1>

        {/** Initial padding */}
        <div
          className={`padding-space ${classNames({
            'shrunken': !newConversationFlag,
            'reduce-motion': reduceMotion
          })}`}
        ></div>

        {/** Input area and submit button */}
        <form onSubmit={handleSubmit} className="w-full">
          <div className="space-y-6 flex flex-col relative items-center">
            {/** Textarea */}
            <textarea
              ref={inputRef}
              tabIndex={0}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                language === "zh"
                  ? "请输入您的问题..."
                  : "Enter your question..."
              }
              className={`input-field w-200 p-4 rounded-lg bg-gray-800 border border-gray-700 outline-none resize-none ${classNames({'reduce-motion': reduceMotion})}`}
              rows={4}
              disabled={loadingState !== "WAITING"}
            />

            {/** Submit Button */}
            <div className="relative h-16">
              <SubmitButton loadingState={loadingState} language={language} reduceMotion={reduceMotion}></SubmitButton>
              {!newConversationFlag && (
                <button className={`w-11 h-11 fade-in relative -right-76 -top-11 transition-opacity duration-300 ${loadingState !== "WAITING" ? 'opacity-0' : 'opacity-100'}`} onClick={(e)=>{
                  e.preventDefault();
                  if(loadingState == 'WAITING') handleSubmit(undefined, true);
                  else abort();
                }}>
                  <i className={`pi ${loadingState !== "WAITING" ? 'pi-stop-circle' : 'pi-undo'} absolute top-[0.8rem] left-[0.81rem]`} style={{fontSize: '22.5 px'}}></i>
                </button>
              )}
            </div>
          </div>
        </form>

        {/** Error Area */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!newConversationFlag && (
          /** whole response area */
          <div className="response-area w-[75%] space-y-4 flex flex-col items-start">
            {(rawThinkingContent.length > 0 || loadingState === 'THINKING' || isUsingThinkingModel && loadingState === 'GENERATING') && (
              // thinking area
              <div className="thinking-wrapper fade-in w-full relative">
                {/** black background - covers button at first, and the thinking content if expanded */}
                <div
                  className={`thinking-background ${classNames({opening: showThinking, closing: !showThinking, "w-46": language === "en", "w-34": language === "en"})} 
                    space-y-2 flex flex-col items-start rounded-lg bg-gray-950
                  h-12 `}
                  ref={thinkingBackgroundRef}
                >
                  <button
                    onClick={() => {
                      setShowThinking(!showThinking);
                    }}
                    className={`expand-thinking-button ${language === "en" ? "w-46" : "w-34"} 
                      !bg-transparent overflow-hidden h-12 text-amber-100 cursor-pointer flex items-center gap-2 hover:border-transparent! hover:outline-transparent! focus-visible:border-2 focus:outline-transparent`}
                  >
                    <div
                      className={`breadcrumb ${classNames({
                        "transition-transform": !reduceMotion,
                        "rotate-90": showThinking,
                      })}`}
                    >
                      <BreadcrumbIcon />
                    </div>
                    {language === "en" ? "Show Thinking" : "查看思考"}
                  </button>
                </div>

                {/** thinking content - initially hidden and z-index -10 */}
                <div
                  className="thinking-content px-8 pt-4 pb-6 w-full h-fit absolute -z-10 text-white opacity-0 transition-opacity top-9 duration-300 delay-120"
                  ref={thinkingContentRef}
                >
                  {renderOutput(isRawMode ? rawThinkingContent : thinkingContent)}
                </div>
              </div>
            )}

            {/** response content */}
            { rawMainResponse.length > 0 && (
              <div className="fade-in delay-300 w-full p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg whitespace-pre-wrap min-h-48">
                <div className="prose prose-invert max-w-none">
                  {renderOutput(isRawMode ? rawMainResponse : mainResponse)}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={tabIndexAnchorRef} tabIndex={-1} style={{position: "fixed", "opacity": 0, "bottom": '50vh'}}></div>
      </div>
    </div>
  );
}

export default App;
