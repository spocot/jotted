import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "../store/redux/store";
import { addToastAction, clearToasts } from "../store/redux/toastSlice";
import ToastContainer from "./ToastContainer";

function renderWithProvider(ui: React.ReactElement) {
  return render(<Provider store={store}>{ui}</Provider>);
}

describe("ToastContainer", () => {
  beforeEach(() => {
    store.dispatch(clearToasts());
  });

  it("renders nothing when no toasts", () => {
    const { container } = renderWithProvider(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toasts", () => {
    store.dispatch(addToastAction({ id: "1", message: "Hello", type: "info" }));
    renderWithProvider(<ToastContainer />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders different toast types", () => {
    store.dispatch(addToastAction({ id: "1", message: "Success!", type: "success" }));
    store.dispatch(addToastAction({ id: "2", message: "Error!", type: "error" }));
    renderWithProvider(<ToastContainer />);
    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("Error!")).toBeInTheDocument();
  });

  it("dismisses toast on click", () => {
    store.dispatch(addToastAction({ id: "1", message: "Dismiss me", type: "info" }));
    renderWithProvider(<ToastContainer />);
    const dismissBtn = screen.getByText("×");
    fireEvent.click(dismissBtn);
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
  });
});
