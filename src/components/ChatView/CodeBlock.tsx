
import { useRef, useEffect } from "react";

// Prism
import Prism from "prismjs";
import "prismjs/themes/prism-okaidia.css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-css";


const CodeBlock = ({
  code,
  text,
  language,
}: {
  code: string;
  text: React.ReactNode[];
  language: string;
}) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.textContent = code;
      Prism.highlightElement(codeRef.current);
    }
  }, [code]);

  return (
    <pre className={`language-${language} rounded-lg my-4 overflow-x-auto`}>
      <code ref={codeRef} className={`language-${language}`}></code>
      <div>{text}</div>
    </pre>
  );
};

export default CodeBlock;