import "@testing-library/jest-dom";
import RootLayout, { metadata, viewport } from "./layout";

jest.mock("next/font/google", () => ({
  Lora: () => ({ className: "lora" }),
  Cinzel: () => ({ className: "cinzel" }),
}));

describe("RootLayout", () => {
  it("exports the application and PWA metadata", () => {
    expect(metadata).toEqual({
      title: "TableRunner",
      description: "A game played between a table-top board game and an app",
      applicationName: "TableRunner",
      manifest: "/manifest.webmanifest",
      appleWebApp: {
        capable: true,
        title: "TableRunner",
        statusBarStyle: "default",
      },
      other: {
        "apple-mobile-web-app-capable": "yes",
      },
    });
  });

  it("exports light and dark theme colors in viewport", () => {
    expect(viewport).toEqual({
      colorScheme: "light dark",
      themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f2ebd9" },
        { media: "(prefers-color-scheme: dark)", color: "#120f0d" },
      ],
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