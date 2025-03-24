// eslint-disable
import { useCallback, useRef, useEffect } from "react";
import OutputType from "../types/outputType";

const useSetEmpty = (
    {language, setThinkingContent, setRawThinkingContent, setMainResponse, setRawMainResponse}: 
    {language: 'zh' | 'en', setThinkingContent: React.Dispatch<React.SetStateAction<OutputType[]>>, setRawThinkingContent: React.Dispatch<React.SetStateAction<OutputType[]>>, setMainResponse: React.Dispatch<React.SetStateAction<OutputType[]>>, setRawMainResponse: React.Dispatch<React.SetStateAction<OutputType[]>>}
) => {
    const setEmptyContent = useCallback(({think, response} : {think?: boolean, response?: boolean}) => {
    if (think) {
        setThinkingContent([]);
        setRawThinkingContent([]);
    }
    if (response) {
        setMainResponse([]);
        setRawMainResponse([]);
    }
    }, [setMainResponse, setRawMainResponse, setRawThinkingContent, setThinkingContent]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const setDefaultThinkingContentRef = useRef<Function>(undefined);
    useEffect(() => {
    setDefaultThinkingContentRef.current = () => {
        setThinkingContent([language === 'zh' ? '[无思考内容]' : '[No Thinking Content]']);
        setRawThinkingContent([language === 'zh' ? '[无思考内容]' : '[No Thinking Content]']);
    };
    }, [language, setRawThinkingContent, setThinkingContent]);
    
    return {setEmptyContent, setDefaultThinkingContentRef};
}

export default useSetEmpty;