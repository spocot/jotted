import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ToastContainer from "./ToastContainer";
import { useToastStore } from "../store/useToastStore";

describe("ToastContainer", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("renders nothing when no toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toasts", () => {
    useToastStore.getState().addToast("Hello", "info");
    render(<ToastContainer />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders different toast types", () => {
    useToastStore.getState().addToast("Success!", "success");
    useToastStore.getState().addToast("Error!", "error");
    render(<ToastContainer />);
    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("Error!")).toBeInTheDocument();
  });

  it("dismisses toast on click", () => {
    useToastStore.getState().addToast("Dismiss me", "info");
    render(<ToastContainer />);
    const dismissBtn = screen.getByText("×");
    fireEvent.click(dismissBtn);
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
  });
});
