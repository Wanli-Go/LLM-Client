import "./App.css";
import { useEffect, useRef, useState } from "react";
import BreadcrumbIcon from "./assets/svg/breadcrumb";
import classNames from "classnames";
import Setting from "./components/Setting";
import useSettings from "./hooks/useSettings";
import CodeBlock from "./components/ChatView/CodeBlock";
import { useCodeBlock } from "./hooks/useCodeBlocks";
import SubmitButtons from "./components/ChatView/SubmitButtons";
import {chatHistory} from "./requests/fetchChatResponse";
import useChatSubmitAndStyle from "./hooks/useSubmit.js";
import useAutoScroll from "./hooks/useAutoScroll.js";
import useThinkingStyles from "./hooks/useThinkingAnimation.js";
import useSetEmpty from "./hooks/useSetEmpty.js";
import OutputType from "./types/outputType.js";

function App() {

  // basic states
  const [newConversationFlag, setNewConversationFlag] = useState(true);
  const [input, setInput] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const [loadingState, setLoadingState] = useState<
    "SENT" | "THINKING" | "GENERATING" | "WAITING"
  >("WAITING");
  const [error, setError] = useState("");

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

  // response output (render raw~Content when using raw mode)
  const [thinkingContent, setThinkingContent] = useState<OutputType[]>([]);
  const [rawThinkingContent, setRawThinkingContent] = useState<OutputType[]>([]);
  const [mainResponse, setMainResponse] = useState<OutputType[]>([]);
  const [rawMainResponse, setRawMainResponse] = useState<OutputType[]>([]);

  const {setEmptyContent, setDefaultThinkingContentRef} = useSetEmpty({language, setThinkingContent, setRawThinkingContent, setMainResponse, setRawMainResponse});

  const { codeBlocks } = useCodeBlock(reduceMotion);
  // render OutputType[] to HTML or text or code blocks
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

  // for focusing when entering the app, and when pressing tab after generation
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tabIndexAnchorRef = useRef<HTMLDivElement>(null);

  // show thinking button animation
  const { thinkingBackgroundRef, thinkingContentRef } = useThinkingStyles({ showThinking, reduceMotion, language,
    thinkingContent, isUsingThinkingModelBuffered, isRawMode});

  // handle submit event
  const { handleSubmit, abort } = useChatSubmitAndStyle({input, setLoadingState, setEmptyContent, isUsingThinkingModelBuffered, 
    reduceMotion, setNewConversationFlag, setThinkingContent, setRawThinkingContent,
    setMainResponse, setRawMainResponse, setError});

  // auto-scroll
  const {scrollRef} = useAutoScroll({rawMainResponse, rawThinkingContent});

  // util ref for not triggering the useEffect below
  const isUsingThinkingModelBufferedRef = useRef(isUsingThinkingModelBuffered); 
  isUsingThinkingModelBufferedRef.current = isUsingThinkingModelBuffered;

  /**
   * When loadingState changes
   */
  useEffect(()=>{
    if (loadingState === 'WAITING') { // after generating: focus on inital tab anchor and push chat history
      if(newConversationFlag)inputRef.current?.focus();
      else {
        tabIndexAnchorRef.current?.focus();
        if(!error){
          chatHistory.push({role: 'user', content: input});
          chatHistory.push({role: 'assistant', content: ([...rawMainResponse] as string[]).join('')});          
        }
      }
    }
    else if (loadingState === 'SENT') setError("");
    else if(loadingState === 'THINKING') { // state changes to thinking: clear all previous response content, and show thinking (delayed for smoothness)
      setEmptyContent({think: true, response: true});
      setNewConversationFlag(false);
      setTimeout(()=>setShowThinking(true), 300);
    }
    else if 
      (loadingState === 'GENERATING' // state changes to generating: if too few thinking tokens, set default thinking content
      && isUsingThinkingModelBufferedRef.current) {  // when not using thinking model, bypass this effect (see useSubmit.tsx line 179)
      setEmptyContent({response: true});
      setThinkingContent((prev) => {
        if (prev.length < 10) {
          requestAnimationFrame(()=>setDefaultThinkingContentRef.current?.());
        }
        return prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingState, newConversationFlag, setEmptyContent, setDefaultThinkingContentRef]); // omit states in dependency

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

        {/** Input area and submit buttons */}
        <div className="space-y-6 flex flex-col relative items-center w-full">
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

          <SubmitButtons loadingState={loadingState} language={language} reduceMotion={reduceMotion} onSubmit={() => handleSubmit({})} newConversationFlag={newConversationFlag} abort={abort}></SubmitButtons>
        </div>

        {/** Error Area */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!newConversationFlag && (
          /** whole response area */
          <div className="response-area w-[75%] space-y-4 flex flex-col items-start">
            {(rawThinkingContent.length > 0) && (
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
