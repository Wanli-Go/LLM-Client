import { useEffect, useState } from 'react';

type Language = "zh" | "en";

const useSettings = (loadingState: "SENT" | "THINKING" | "GENERATING" | "WAITING") => {
  const [language, setLanguage] = useState<Language>("zh");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isRawMode, setIsRawMode] = useState(false);
  const [isUsingThinkingModel, setIsUsingThinkingModel] = useState(true);
  const [isUsingThinkingModelBuffered, setIsUsingThinkingModelBuffered] = useState(true);

  // 仅在下次submit时生效
  useEffect(()=>{
    if(loadingState === 'WAITING') {
      setIsUsingThinkingModelBuffered(isUsingThinkingModel);
    }
  }, [isUsingThinkingModel, loadingState]);

  useEffect(()=>{
    const localThink = localStorage.getItem('think');
    const localRaw = localStorage.getItem('raw');
    const localReduce = localStorage.getItem('reduce');
    const localLang = localStorage.getItem('language');
    if(localThink === 'false') setIsUsingThinkingModel(false);
    if(localRaw === 'true') setIsRawMode(true);
    if(localReduce === 'true') setReduceMotion(true);
    if(localLang === 'en') setLanguage('en');
  },[]);

  useEffect(()=>{
    localStorage.setItem('think', isUsingThinkingModel.toString());
    localStorage.setItem('raw', isRawMode.toString());
    localStorage.setItem('reduce', reduceMotion.toString());
    localStorage.setItem('language', language);
  }, [language, reduceMotion, isRawMode, isUsingThinkingModel]);

  return {
    language,
    setLanguage,
    reduceMotion,
    setReduceMotion,
    isRawMode,
    setIsRawMode,
    isUsingThinkingModel,
    setIsUsingThinkingModel,
    isUsingThinkingModelBuffered
  };
};

export default useSettings;