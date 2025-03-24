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

type SubmitButtonsProps = {
  newConversationFlag: boolean;
	loadingState: string;
	language: 'zh' | 'en';
	reduceMotion: boolean;
  onSubmit: ({regen}: {regen?: boolean}) => void;
  abort:() => void;
}

const SubmitButtons : React.FC<SubmitButtonsProps> = ({ newConversationFlag, loadingState, language, reduceMotion, onSubmit, abort }) => {

  return (
    <div className="relative h-16">
      <button
        type="submit"
        disabled={loadingState !== "WAITING"}
        className="w-72 py-3 px-6 disabled:cursor-default! rounded-lg font-medium transition-colors flex items-center justify-center"
        onClick={()=>onSubmit({})} 
      >
        {(!reduceMotion && loadingState !== "WAITING") && <LoadingIcon />}
        <span className={`${!reduceMotion && (loadingState !== "WAITING") ? "font-bold insane-animation text-transparent bg-[linear-gradient(90deg,rgba(44,44,44,1)_0%,rgba(44,44,44,1)_45%,rgba(255,255,255,1)_50%,rgba(44,44,44,1)_55%,rgba(44,44,44,1)_100%)]" : ''}`}
        >
          {getButtonText(loadingState, language)}
        </span>
      </button>
      {!newConversationFlag && (
        <button className={`w-11 h-11 fade-in relative -right-76 -top-11 transition-opacity duration-300 ${loadingState !== "WAITING" ? 'opacity-0' : 'opacity-100'}`} onClick={(e)=>{
          e.preventDefault();
          if(loadingState == 'WAITING') onSubmit({regen: true});
          else abort();
        }}>
          <i className={`pi ${loadingState !== "WAITING" ? 'pi-stop-circle' : 'pi-undo'} absolute top-[0.8rem] left-[0.81rem]`} style={{fontSize: '22.5 px'}}></i>
        </button>
      )}
    </div>
  );
};

export default SubmitButtons;
