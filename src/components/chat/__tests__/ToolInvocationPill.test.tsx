import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationPill } from "../ToolInvocationPill";

afterEach(() => {
  cleanup();
});

test("shows 'Creating Card.jsx' for str_replace_editor create when in-progress", () => {
  render(
    <ToolInvocationPill
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Card.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating Card.jsx")).toBeTruthy();
});

test("shows 'Created Card.jsx' when state is result", () => {
  render(
    <ToolInvocationPill
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Card.jsx" }}
      state="output-available"
      result={{ success: true }}
    />
  );
  expect(screen.getByText("Created Card.jsx")).toBeTruthy();
});

test("shows 'Editing App.jsx' for str_replace command", () => {
  render(
    <ToolInvocationPill
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeTruthy();
});

test("shows 'Editing' for insert command", () => {
  render(
    <ToolInvocationPill
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/src/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeTruthy();
});

test("shows 'Reading' and 'Read' for view command", () => {
  const { rerender } = render(
    <ToolInvocationPill
      toolName="str_replace_editor"
      args={{ command: "view", path: "/src/utils.ts" }}
      state="call"
    />
  );
  expect(screen.getByText("Reading utils.ts")).toBeTruthy();

  rerender(
    <ToolInvocationPill
      toolName="str_replace_editor"
      args={{ command: "view", path: "/src/utils.ts" }}
      state="output-available"
      result={{ content: "" }}
    />
  );
  expect(screen.getByText("Read utils.ts")).toBeTruthy();
});

test("shows 'Deleting styles.css' for file_manager delete", () => {
  render(
    <ToolInvocationPill
      toolName="file_manager"
      args={{ command: "delete", path: "/src/styles.css" }}
      state="call"
    />
  );
  expect(screen.getByText("Deleting styles.css")).toBeTruthy();
});

test("shows 'Renaming index.js' for file_manager rename", () => {
  render(
    <ToolInvocationPill
      toolName="file_manager"
      args={{ command: "rename", path: "/src/index.js", new_path: "/src/main.js" }}
      state="call"
    />
  );
  expect(screen.getByText("Renaming index.js")).toBeTruthy();
});

test("falls back to toolName for unrecognised command", () => {
  render(
    <ToolInvocationPill
      toolName="some_tool"
      args={{ command: "unknown", path: "/src/file.ts" }}
      state="call"
    />
  );
  expect(screen.getByText("some_tool")).toBeTruthy();
});

test("uses filename only, not full path", () => {
  render(
    <ToolInvocationPill
      toolName="str_replace_editor"
      args={{ command: "create", path: "/deeply/nested/path/Component.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating Component.tsx")).toBeTruthy();
});

test("shows spinner when in-progress", () => {
  const { container } = render(
    <ToolInvocationPill
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Card.jsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeTruthy();
});

test("shows green dot when completed", () => {
  const { container } = render(
    <ToolInvocationPill
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Card.jsx" }}
      state="output-available"
      result={{ success: true }}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
