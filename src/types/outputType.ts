type OutputType = 
{ type: "text"; content: React.ReactNode } // styled text
| { type: "code"; id: string } // code block placeholder, will render as CodeBlock
| string // raw text (optional)
| null; // for safety

export default OutputType;