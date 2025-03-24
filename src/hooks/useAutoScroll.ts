import { useRef, useEffect } from "react";
import { animation } from "../utils/scrolldown-animation";
import OutputType from "../types/outputType";

const useAutoScroll = ({rawMainResponse, rawThinkingContent} : {rawMainResponse: OutputType[], rawThinkingContent: OutputType[]}) => {
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
        if ( target - scrollDom.scrollTop > 50) {
          isGluedToButtom.current = false;
        }
      }
    },[rawMainResponse, rawThinkingContent]);
    useEffect(()=>{
      document.addEventListener('scrolledUp', ()=>{
        isGluedToButtom.current = false;
      })
    }, []);

    return {scrollRef};
}


export default useAutoScroll;