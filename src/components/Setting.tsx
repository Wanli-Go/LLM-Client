import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";

type SettingProps = {
    reduceMotion: boolean;
    setReduceMotion: React.Dispatch<React.SetStateAction<boolean>>;
    isUsingThinkingModel: boolean;
    setIsUsingThinkingModel: React.Dispatch<React.SetStateAction<boolean>>;
    language: "zh" | "en";
    setLanguage: React.Dispatch<React.SetStateAction<"zh" | "en">>;
    isRawMode: boolean;
    setIsRawMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const Setting = (props: SettingProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingAnimation, setShowSettingAnimation] = useState(false);
  const preventReanimateFlag = useRef(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLElement>(null);
  const firstOptionRef = useRef<HTMLLabelElement>(null);
  const languageDropdownRef = useRef<HTMLSelectElement>(null);

  const onClick = useCallback(() => {
    setShowSettingAnimation(() => {
        if(!showSettings){
            setShowSettings(true);
            setTimeout(() => {
                preventReanimateFlag.current = true;
            }, 350);
            return true;
        } 
        if (showSettings && !props.reduceMotion) {
            setTimeout(() => {
                setShowSettings(false);
                preventReanimateFlag.current = false;
            }, 300);
            return false;
        }
        preventReanimateFlag.current = false;
        setShowSettings(false);
        return false;
    });
  },[props, showSettings]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(event.target as Node) && showSettings) {
        onClick();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClick]);

  // Ctrl + L to show setting
  const handleKeyDown = useCallback((event: { ctrlKey: unknown; metaKey: unknown; key: string; preventDefault: () => void; }) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
      event.preventDefault(); 
      onClick();
      setTimeout(()=>{
        requestAnimationFrame(()=>{
          firstOptionRef.current?.focus();
        })
      }, 150)
    }
    if(event.key === 'Escape' && showSettings) 
      {
        event.preventDefault();
        onClick();
      }
  },[onClick]);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div ref={areaRef} className="absolute top-0 right-0 z-50">
      <i ref={iconRef} className={"pi pi-cog text-3xl cursor-pointer " + classNames({ "pi-spin": showSettings && !props.reduceMotion })} onClick={onClick}></i>
      {showSettings && (
        <div className={"absolute right-0 flex w-52 flex-col gap-1.5 border-2 border-grey-300 rounded-2xl p-6 mt-4 " + classNames({"fade-in": !props.reduceMotion && showSettingAnimation && !preventReanimateFlag.current, "fade-out": !props.reduceMotion && !showSettingAnimation})}>
          <label ref={firstOptionRef} htmlFor="thinking-model" className="cursor-pointer">
            <input
              type="checkbox"
              id="thinking-model"
              checked={props.isUsingThinkingModel}
              onChange={() => props.setIsUsingThinkingModel((prev) => !prev)}
            />
            <span className="pl-2">{props.language === 'zh' ? '思考模式' : 'Thinking Model'}</span>
          </label>
          <label htmlFor="raw-mode" className="cursor-pointer">
            <input
              type="checkbox"
              id="raw-mode"
              checked={props.isRawMode}
              onChange={() => props.setIsRawMode((prev) => !prev)}
            />
            <span className="pl-2">{props.language === 'zh' ? '原生 Markdown' : 'Raw Markdown'}</span>
          </label>
          <label htmlFor="reduce-motion" className="cursor-pointer">
            <input
              type="checkbox"
              id="reduce-motion"
              checked={props.reduceMotion}
              onChange={() => props.setReduceMotion((prev) => !prev)}
            />
            <span className="pl-2">{props.language === 'zh' ? '减少动态效果' : 'Reduce Motion'}</span>
          </label>
          <select
            id="language"
            ref={languageDropdownRef}
            value={props.language}
            onChange={(e) => props.setLanguage(e.target.value as "zh" | "en")}
          >
            <option className="text-gray-800" value="zh">中文</option>
            <option className="text-gray-800" value="en">English</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default Setting;
