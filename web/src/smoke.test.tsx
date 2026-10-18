import { render, screen } from "@testing-library/react";
import { Banner } from "@/ui";

test("renders shared Banner", () => {
  render(<Banner title="olá" />);
  expect(screen.getByText("olá")).toBeInTheDocument();
});
