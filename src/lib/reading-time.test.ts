import { describe, it, expect } from "vitest";
import { calculateReadingTime } from "./reading-time";

describe("calculateReadingTime", () => {
  it("returns a minimum of 1 minute for short or empty bodies", () => {
    expect(calculateReadingTime("")).toBe(1);
    expect(calculateReadingTime("Just a few words here.")).toBe(1);
  });

  it("rounds up (never undersells) based on 200 wpm", () => {
    // 250 words / 200 wpm = 1.25 min → ceil → 2
    const body = Array.from({ length: 250 }, () => "palabra").join(" ");
    expect(calculateReadingTime(body)).toBe(2);
  });

  it("ignores markdown syntax when counting words", () => {
    const body = "# Título\n\n**negrita** y [un enlace](https://x) y `código`";
    // Only real words counted, well under a minute → 1.
    expect(calculateReadingTime(body)).toBe(1);
  });

  it("adds time for images (12s each)", () => {
    // 200 words = 1 min exactly; 5 images × 12s = 60s = +1 min → 2.
    const words = Array.from({ length: 200 }, () => "w").join(" ");
    const images = Array.from({ length: 5 }, (_, i) => `![alt](img${i}.png)`).join(" ");
    expect(calculateReadingTime(`${words} ${images}`)).toBe(2);
  });

  it("does not count fenced code blocks as words", () => {
    const body = "```\nconst a = 1;\nconst b = 2;\nlots of code tokens here\n```";
    expect(calculateReadingTime(body)).toBe(1);
  });
});
