import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import { ChatProvider, useChat } from "../chat-context";
import { useFileSystem } from "../file-system-context";
import { useChat as useAIChat } from "@ai-sdk/react";
import * as anonTracker from "@/lib/anon-work-tracker";

// Mock dependencies
vi.mock("../file-system-context", () => ({
  useFileSystem: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    DefaultChatTransport: vi.fn().mockImplementation(() => ({})),
  };
});

vi.mock("@/lib/anon-work-tracker", () => ({
  setHasAnonWork: vi.fn(),
}));

// Helper component to access chat context
function TestComponent() {
  const chat = useChat();
  return (
    <div>
      <div data-testid="messages">{chat.messages.length}</div>
      <textarea
        data-testid="input"
        value={chat.input}
        onChange={chat.handleInputChange}
      />
      <form data-testid="form" onSubmit={chat.handleSubmit}>
        <button type="submit">Submit</button>
      </form>
      <div data-testid="status">{chat.status}</div>
    </div>
  );
}

describe("ChatContext", () => {
  const mockFileSystem = {
    serialize: vi.fn(() => ({ "/test.js": { type: "file", content: "test" } })),
  };

  const mockHandleToolCall = vi.fn();
  const mockSendMessage = vi.fn();

  const mockUseAIChat = {
    messages: [],
    sendMessage: mockSendMessage,
    status: "ready",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useFileSystem as any).mockReturnValue({
      fileSystem: mockFileSystem,
      handleToolCall: mockHandleToolCall,
    });

    (useAIChat as any).mockReturnValue(mockUseAIChat);
  });

  afterEach(() => {
    cleanup();
  });

  test("renders with default values", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId("messages").textContent).toBe("0");
    expect(screen.getByTestId("status").textContent).toBe("ready");
  });

  test("passes initialMessages to useChat", () => {
    const initialMessages = [
      { id: "1", role: "user" as const, parts: [{ type: "text" as const, text: "Hello" }] },
      { id: "2", role: "assistant" as const, parts: [{ type: "text" as const, text: "Hi there!" }] },
    ];

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: initialMessages,
    });

    render(
      <ChatProvider projectId="test-project" initialMessages={initialMessages}>
        <TestComponent />
      </ChatProvider>
    );

    const callArgs = (useAIChat as any).mock.calls[0][0];
    expect(callArgs.messages).toEqual(initialMessages);
    expect(screen.getByTestId("messages").textContent).toBe("2");
  });

  test("passes onToolCall that maps input to args", () => {
    let onToolCallHandler: any;

    (useAIChat as any).mockImplementation((config: any) => {
      onToolCallHandler = config.onToolCall;
      return mockUseAIChat;
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    const toolCall = { toolName: "str_replace_editor", toolCallId: "call-1", input: { command: "create" } };
    onToolCallHandler({ toolCall });

    expect(mockHandleToolCall).toHaveBeenCalledWith({
      toolName: "str_replace_editor",
      args: { command: "create" },
    });
  });

  test("tracks anonymous work when no project ID", async () => {
    const mockMessages = [
      { id: "1", role: "user" as const, parts: [{ type: "text" as const, text: "Hello" }] },
    ];

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: mockMessages,
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    await waitFor(() => {
      expect(anonTracker.setHasAnonWork).toHaveBeenCalledWith(
        mockMessages,
        mockFileSystem.serialize()
      );
    });
  });

  test("does not track anonymous work when project ID exists", async () => {
    const mockMessages = [
      { id: "1", role: "user" as const, parts: [{ type: "text" as const, text: "Hello" }] },
    ];

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: mockMessages,
    });

    render(
      <ChatProvider projectId="test-project">
        <TestComponent />
      </ChatProvider>
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(anonTracker.setHasAnonWork).not.toHaveBeenCalled();
  });

  test("passes through status from useChat", () => {
    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      status: "streaming",
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("streaming");
  });

  test("handleSubmit does not call sendMessage when input is empty", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    const form = screen.getByTestId("form");

    await act(async () => {
      const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  test("useChat context is not accessible outside ChatProvider", () => {
    // Using a component that tries to access context outside provider
    function ComponentOutsideProvider() {
      try {
        useChat();
        return <div>No error</div>;
      } catch (e: any) {
        return <div>Error: {e.message}</div>;
      }
    }

    render(<ComponentOutsideProvider />);
    expect(screen.getByText("Error: useChat must be used within a ChatProvider")).toBeDefined();
  });
});
