import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel {
  readonly specificationVersion = "v2" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;
  readonly supportedUrls: Record<string, RegExp[]> = {};

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: any[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: any[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: any[],
    userPrompt: string
  ): AsyncGenerator<any> {
    yield { type: "stream-start", warnings: [] };

    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    const emitText = async function* (self: MockLanguageModel, id: string, text: string, delayMs: number) {
      yield { type: "text-start", id };
      for (const char of text) {
        yield { type: "text-delta", id, delta: char };
        await self.delay(delayMs);
      }
      yield { type: "text-end", id };
    };

    const emitToolCall = function* (id: string, toolName: string, args: object) {
      const input = JSON.stringify(args);
      yield { type: "tool-input-start", id, toolName };
      yield { type: "tool-input-delta", id, delta: input };
      yield { type: "tool-input-end", id };
      yield { type: "tool-call", toolCallId: id, toolName, input };
    };

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      yield* emitText(this, "text-1", `I'll create a ${componentName} component for you.`, 25);
      yield* emitToolCall("call_1", "str_replace_editor", {
        command: "create",
        path: `/components/${componentName}.jsx`,
        file_text: this.getComponentCode(componentType),
      });
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      yield* emitText(this, "text-1", `Now let me enhance the component with better styling.`, 25);
      yield* emitToolCall("call_2", "str_replace_editor", {
        command: "str_replace",
        path: `/components/${componentName}.jsx`,
        old_str: this.getOldStringForReplace(componentType),
        new_str: this.getNewStringForReplace(componentType),
      });
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      yield* emitText(this, "text-1", `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`, 15);
      yield* emitToolCall("call_3", "str_replace_editor", {
        command: "create",
        path: "/App.jsx",
        file_text: this.getAppCode(componentName),
      });
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:\n\n1. **${componentName}.jsx** - A fully-featured ${componentType} component\n2. **App.jsx** - The main app file that displays the component\n\nThe component is now ready to use. You can see the preview on the right side of the screen.`;
      yield* emitText(this, "text-1", text, 30);
      yield { type: "finish", finishReason: "stop", usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100 } };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-8 border border-white/10">
      <h2 className="text-2xl font-black text-white mb-1">Get in touch</h2>
      <p className="text-zinc-500 text-sm mb-8">We'll get back to you within 24 hours.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {[
          { id: 'name', label: 'Name', type: 'text' },
          { id: 'email', label: 'Email', type: 'email' },
        ].map(({ id, label, type }) => (
          <div key={id}>
            <label htmlFor={id} className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              {label}
            </label>
            <input
              type={type}
              id={id}
              name={id}
              value={formData[id]}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
            />
          </div>
        ))}
        <div>
          <label htmlFor="message" className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200 resize-none"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/30"
        >
          Send message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({
  plan = "Pro",
  price = "49",
  description = "Everything you need to ship faster and smarter.",
  features = ["Unlimited projects", "Priority support", "Advanced analytics", "Custom integrations"],
}) => {
  return (
    <div className="relative bg-zinc-900 rounded-2xl p-8 border border-white/10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/5 pointer-events-none" />
      <div className="relative">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-400 mb-4">
          {plan}
        </span>
        <div className="flex items-end gap-1 mb-3">
          <span className="text-6xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            \${price}
          </span>
          <span className="text-zinc-500 mb-2 text-sm">/mo</span>
        </div>
        <p className="text-zinc-400 text-sm mb-6">{description}</p>
        <ul className="space-y-3 mb-8">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
              <span className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>
        <button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/30">
          Get started
        </button>
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-8 bg-zinc-900 rounded-2xl p-12 border border-white/10">
      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Counter</span>
      <div className="text-8xl font-black tabular-nums bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
        {count}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setCount(c => c - 1)}
          className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xl font-bold hover:bg-zinc-700 hover:border-zinc-500 transition-all duration-200 hover:-translate-y-0.5"
        >
          −
        </button>
        <button
          onClick={() => setCount(0)}
          className="px-5 h-12 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-700 hover:border-zinc-500 transition-all duration-200"
        >
          Reset
        </button>
        <button
          onClick={() => setCount(c => c + 1)}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-xl font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/30"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '      <div className="p-6">';
      default:
        return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '      <div className="p-6 hover:bg-gray-50 transition-colors">';
      default:
        return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Card />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(options: any): Promise<any> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    const parts: any[] = [];
    for await (const part of this.generateMockStream(options.prompt, userPrompt)) {
      parts.push(part);
    }

    const textContent = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => p.delta)
      .join("");

    const toolCallContent = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        type: "tool-call" as const,
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        input: p.input,
      }));

    const finishPart = parts.find((p) => p.type === "finish") as any;

    return {
      content: [
        ...(textContent ? [{ type: "text" as const, text: textContent }] : []),
        ...toolCallContent,
      ],
      finishReason: finishPart?.finishReason ?? "stop",
      usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      warnings: [],
    };
  }

  async doStream(options: any): Promise<any> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<any>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return { stream };
  }
}

export function getLanguageModel(): LanguageModel {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0") as unknown as LanguageModel;
  }

  return anthropic(MODEL);
}
