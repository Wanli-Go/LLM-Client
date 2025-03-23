import React from "react";
import LoadingIcon from "../../assets/svg/loading";
import "../../App.css"

const getButtonText = (loadingState: string, language: 'zh' | 'en') => {
  switch (loadingState) {
    case "WAITING":
      return language === "zh" ? "生成回答" : "Generate Response";
    case "SENT":
      return language === "zh" ? "请求已发送..." : "Request Sent...";
    case "THINKING":
      return language === "zh" ? "正在思考..." : "Thinking...";
    case "GENERATING":
      return language === "zh" ? "正在生成回答..." : "Generating Response...";
    default:
      return "";
  }
};

type SubmitButtonProps = {
	loadingState: string;
	language: 'zh' | 'en';
	reduceMotion: boolean;
}

const SubmitButton : React.FC<SubmitButtonProps> = ({ loadingState, language, reduceMotion }) => {

  return (
    <button
      type="submit"
      disabled={loadingState !== "WAITING"}
      className="w-72 py-3 px-6 disabled:cursor-default! rounded-lg font-medium transition-colors flex items-center justify-center "
    >
      {(!reduceMotion && loadingState !== "WAITING") && <LoadingIcon />}
      <span className={`${!reduceMotion && (loadingState !== "WAITING") ? "font-bold insane-animation text-transparent bg-[linear-gradient(90deg,rgba(44,44,44,1)_0%,rgba(44,44,44,1)_45%,rgba(255,255,255,1)_50%,rgba(44,44,44,1)_55%,rgba(44,44,44,1)_100%)]" : ''}`}
      >
        {getButtonText(loadingState, language)}
      </span>
    </button>
  );
};

export default SubmitButton;
