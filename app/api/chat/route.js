// app/api/chat/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';

export async function POST(req) {
  try {
    const { messages, provider, model } = await req.json();
    console.log('Received request:', { provider, model, messageCount: messages.length });

    switch (provider) {
        case 'openai': {
            try {
              const openaiClient = new OpenAI({  // Note: OpenAI instead of openai
                apiKey: process.env.OPENAI_API_KEY,
              });
          
              const response = await openaiClient.chat.completions.create({
                model: model || 'gpt-4',  // Note: 'gpt-4' instead of 'GPT-4o'
                messages,
                stream: true,
              });
          
              const stream = new TransformStream();
              const writer = stream.writable.getWriter();
              const encoder = new TextEncoder();
          
              // Stream the response text
              (async () => {
                try {
                  for await (const chunk of response) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    await writer.write(encoder.encode(text));
                  }
                } catch (error) {
                  console.error('OpenAI stream processing error:', error);
                } finally {
                  await writer.close();
                }
              })();
          
              return new Response(stream.readable);
            } catch (error) {
              console.error('OpenAI error:', error);
              return NextResponse.json(
                { error: `OpenAI error: ${error.message}` },
                { status: 500 }
              );
            }
          }

          case 'anthropic': {
            try {
              const { text } = await generateText({
                model: anthropic(model || 'claude-3-haiku-20240307'),
                prompt: messages.map(m => m.content).join(' '),
              });
          
              // Format response like Gemini
              return NextResponse.json({ 
                response: text 
              });
            } catch (error) {
              console.error('Anthropic error:', error);
              return NextResponse.json(
                { error: `Anthropic error: ${error.message}` },
                { status: 500 }
              );
            }
          }

      case 'google': {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
          const chat = genAI.getGenerativeModel({ model: model || 'gemini-pro' });
          
          // Format messages correctly for Gemini
          const formattedMessages = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));
      
          // Generate content with the formatted messages
          const result = await chat.generateContent({
            contents: formattedMessages
          });
      
          // Get the full response text
          const fullText = result.response.text();
      
          return NextResponse.json({ response: fullText });
        } catch (error) {
          console.error('Google AI error:', error);
          return NextResponse.json(
            { error: `Google AI error: ${error.message}` },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid provider' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
