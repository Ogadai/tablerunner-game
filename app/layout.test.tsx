import "@testing-library/jest-dom";
import RootLayout, { metadata } from "./layout";

jest.mock("next/font/google", () => ({
  Lora: () => ({ className: "lora" }),
  Cinzel: () => ({ className: "cinzel" }),
}));

describe("RootLayout", () => {
  it("exports the application metadata", () => {
    expect(metadata).toEqual({
      title: "TableRunner",
      description: "A game played between a table-top board game and an app",
    });
  });

  it("renders children in an English document with the Lora font", () => {
    const child = <main>Game content</main>;
    const html = RootLayout({ params: Promise.resolve({}), children: child });
    const body = html.props.children;

    expect(html.type).toBe("html");
    expect(html.props.lang).toBe("en");
    expect(html.props.className).toBe("lora antialiased");
    expect(body.type).toBe("body");
    expect(body.props.children).toBe(child);
  });
});