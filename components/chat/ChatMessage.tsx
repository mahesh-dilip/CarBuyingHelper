'use client';

import { UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Extract different types of content
  const textParts = message.parts.filter(part => part.type === 'text');
  const toolCallParts = message.parts.filter(part => part.type === 'tool-call');
  const toolResultParts = message.parts.filter(part => part.type === 'tool-result');

  const textContent = textParts.map(part => part.text).join('');

  // Console logging for debugging
  if (!isUser && (toolCallParts.length > 0 || toolResultParts.length > 0)) {
    console.log('[ChatMessage] Tool activity detected:', {
      toolCalls: toolCallParts.length,
      toolResults: toolResultParts.length,
      message
    });
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-3xl rounded-lg px-6 py-4 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{textContent}</p>
        ) : (
          <div>
            {/* Tool calls indicator */}
            {toolCallParts.length > 0 && (
              <div className="mb-3 space-y-2">
                {toolCallParts.map((part: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-medium text-blue-900">
                        Calling tool: <code className="bg-blue-100 px-1 rounded">{part.toolName}</code>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tool results indicator */}
            {toolResultParts.length > 0 && (
              <div className="mb-3 space-y-2">
                {toolResultParts.map((part: any, idx: number) => (
                  <div key={idx} className="text-sm bg-green-50 border border-green-200 rounded px-3 py-2">
                    <div className="flex items-center gap-2 text-green-900">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">
                        Tool completed: <code className="bg-green-100 px-1 rounded">{part.toolName}</code>
                      </span>
                    </div>
                    {part.result && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-green-700 hover:text-green-900">View result</summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                          {typeof part.result === 'string' ? part.result : JSON.stringify(part.result, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Text content */}
            <div className="prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2">
              <ReactMarkdown>{textContent}</ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
