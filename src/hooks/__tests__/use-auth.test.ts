import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@/hooks/use-auth";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock server actions
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
  });

  describe("initial state", () => {
    it("starts with isLoading false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    describe("happy path", () => {
      it("calls signIn action with email and password", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "proj-1" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockSignInAction).toHaveBeenCalledWith("user@example.com", "password123");
      });

      it("returns the result from the sign-in action", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "proj-1" } as any);

        const { result } = renderHook(() => useAuth());
        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signIn("user@example.com", "password123");
        });

        expect(returnValue).toEqual({ success: true });
      });

      it("sets isLoading to true during sign-in and false after", async () => {
        let resolveSignIn!: (v: any) => void;
        mockSignInAction.mockReturnValue(new Promise((res) => (resolveSignIn = res)));
        mockCreateProject.mockResolvedValue({ id: "proj-1" } as any);

        const { result } = renderHook(() => useAuth());

        act(() => {
          result.current.signIn("user@example.com", "password123");
        });

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
          resolveSignIn({ success: true });
        });

        expect(result.current.isLoading).toBe(false);
      });
    });

    describe("error state", () => {
      it("returns the error result when sign-in fails", async () => {
        mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

        const { result } = renderHook(() => useAuth());
        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signIn("user@example.com", "wrongpassword");
        });

        expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
      });

      it("does not redirect when sign-in fails", async () => {
        mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "wrongpassword");
        });

        expect(mockPush).not.toHaveBeenCalled();
      });

      it("sets isLoading to false even when the action throws", async () => {
        mockSignInAction.mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123").catch(() => {});
        });

        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("signUp", () => {
    describe("happy path", () => {
      it("calls signUp action with email and password", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "proj-1" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signUp("newuser@example.com", "newpassword");
        });

        expect(mockSignUpAction).toHaveBeenCalledWith("newuser@example.com", "newpassword");
      });

      it("returns the result from the sign-up action", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "proj-1" } as any);

        const { result } = renderHook(() => useAuth());
        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signUp("newuser@example.com", "newpassword");
        });

        expect(returnValue).toEqual({ success: true });
      });

      it("sets isLoading to false after sign-up completes", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "proj-1" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signUp("newuser@example.com", "newpassword");
        });

        expect(result.current.isLoading).toBe(false);
      });
    });

    describe("error state", () => {
      it("returns the error result when sign-up fails", async () => {
        mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

        const { result } = renderHook(() => useAuth());
        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signUp("existing@example.com", "password123");
        });

        expect(returnValue).toEqual({ success: false, error: "Email already registered" });
      });

      it("does not redirect when sign-up fails", async () => {
        mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signUp("existing@example.com", "password123");
        });

        expect(mockPush).not.toHaveBeenCalled();
      });

      it("sets isLoading to false even when the action throws", async () => {
        mockSignUpAction.mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signUp("user@example.com", "password123").catch(() => {});
        });

        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("post sign-in redirect logic", () => {
    describe("when anonymous work exists", () => {
      it("creates a project with the anonymous work data", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "make a button" }],
          fileSystemData: { "/": { type: "directory" } },
        };
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockSignInAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "anon-proj" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: anonWork.messages,
            data: anonWork.fileSystemData,
          })
        );
      });

      it("clears the anonymous work after creating the project", async () => {
        mockGetAnonWorkData.mockReturnValue({
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: {},
        });
        mockSignInAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "anon-proj" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockClearAnonWork).toHaveBeenCalled();
      });

      it("redirects to the newly created project", async () => {
        mockGetAnonWorkData.mockReturnValue({
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: {},
        });
        mockSignInAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "anon-proj" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/anon-proj");
      });

      it("does not call getProjects when anon work exists", async () => {
        mockGetAnonWorkData.mockReturnValue({
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: {},
        });
        mockSignInAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "anon-proj" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockGetProjects).not.toHaveBeenCalled();
      });
    });

    describe("when anon work exists but has no messages", () => {
      it("falls through to existing project lookup when messages array is empty", async () => {
        mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([{ id: "existing-proj" }] as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockGetProjects).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-proj");
      });
    });

    describe("when no anonymous work exists", () => {
      it("redirects to the user's most recent project when one exists", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([
          { id: "recent-proj" },
          { id: "older-proj" },
        ] as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/recent-proj");
      });

      it("creates a new project when the user has no existing projects", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "brand-new-proj" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: [], data: {} })
        );
        expect(mockPush).toHaveBeenCalledWith("/brand-new-proj");
      });

      it("does not clear anon work when there is no anon work", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([{ id: "existing-proj" }] as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockClearAnonWork).not.toHaveBeenCalled();
      });

      it("applies the same redirect logic after signUp", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockSignUpAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([{ id: "user-proj" }] as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signUp("newuser@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/user-proj");
      });
    });
  });
});
