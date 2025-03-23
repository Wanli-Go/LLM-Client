import { sleep } from "radashi";

type ChatType = {
  role: 'user' | 'assistant',
  content: string
}

const chatHistory: ChatType[] = [];

const apiUrl = import.meta.env.VITE_API_OLLAMA_URL as string;
const thinkingModelName = import.meta.env.VITE_THINKING_MODEL_NAME as string;
const generalModelName = import.meta.env.VITE_GENERAL_MODEL_NAME as string;

const fetchChatResponse = async (input: string, isUsingThinkingModel: boolean, signal: AbortSignal) => {
  await sleep(300);
  
  console.log(`Request Sent to ${isUsingThinkingModel ? thinkingModelName : generalModelName}`)

  const requestBody = JSON.stringify({
    model: isUsingThinkingModel ? thinkingModelName : generalModelName,
    messages: [
      ...chatHistory,
      { role: "user", content: input }
    ],
  });

  console.log(requestBody);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: requestBody,
    signal
  });

  if (!response.body) throw new Error("No response body");
  return response.body.getReader();
};

export { fetchChatResponse, chatHistory };