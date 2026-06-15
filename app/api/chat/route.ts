/**
 * Chat API Route
 * Handles streaming conversation with the CarMind agent
 */

import { streamText, convertToModelMessages, stepCountIs, UIMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { ADVISOR_SYSTEM_PROMPT } from '@/lib/prompts/advisor-prompt';
import { getSession, addMessage } from '@/lib/db/supabase';
import { aiTools } from '@/lib/utils/ai-tools';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, sessionId }: { messages: UIMessage[], sessionId: string } = await req.json();

    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    // Get session from database
    const session = await getSession(sessionId);
    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    // Prepare system prompt with current state
    const systemPrompt = ADVISOR_SYSTEM_PROMPT.replace(
      '{{state}}',
      session.state
    );

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages);

    // Stream response using Vercel AI SDK with Anthropic
    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: systemPrompt,
      messages: modelMessages,
      tools: aiTools,
      stopWhen: stepCountIs(5), // Allow multi-step tool execution in single turn
      onStepFinish: ({ toolCalls, toolResults }) => {
        if (toolCalls && toolCalls.length > 0) {
          console.log('[Chat API] Tool calls:', JSON.stringify(toolCalls, null, 2));
        }
        if (toolResults && toolResults.length > 0) {
          console.log('[Chat API] Tool results:', JSON.stringify(toolResults, null, 2));
        }
      },
      onFinish: async ({ text, toolCalls, toolResults }) => {
        console.log('[Chat API] Finished:', {
          textLength: text.length,
          toolCallsCount: toolCalls?.length || 0,
          toolResultsCount: toolResults?.length || 0
        });
        // Save messages to database
        // Extract text from the last user message
        const lastUserMessage = messages[messages.length - 1];
        const userText = lastUserMessage.parts
          .filter(p => p.type === 'text')
          .map(p => p.text)
          .join('');

        // Save user message
        await addMessage(sessionId, {
          role: 'user',
          content: userText,
        });

        // Save assistant response
        await addMessage(sessionId, {
          role: 'assistant',
          content: text,
        });

        // Note: user_sessions.updated_at is maintained automatically by the
        // `update_user_sessions_updated_at` DB trigger, so no manual touch needed.
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
