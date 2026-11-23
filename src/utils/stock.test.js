import { describe, expect, it } from "vitest";
import { stockEquivalent } from "./stock.js";

describe("stockEquivalent", () => {
  it("converts kilograms to tonnes from 1000 kg", () => {
    expect(stockEquivalent(1500, "kg")).toContain("1,5");
    expect(stockEquivalent(1500, "kg")).toContain("tonne(s)");
  });

  it("converts tonnes to kilograms", () => {
    expect(stockEquivalent(1.25, "tonne")).toContain("1 250");
    expect(stockEquivalent(1.25, "tonne")).toContain("kg");
  });

  it("converts grams to kilograms from 1000 g", () => {
    expect(stockEquivalent(2500, "g")).toContain("2,5");
    expect(stockEquivalent(2500, "g")).toContain("kg");
  });

  it("converts millilitres to litres from 1000 ml", () => {
    expect(stockEquivalent(2500, "ml")).toContain("2,5");
    expect(stockEquivalent(2500, "ml")).toContain("L");
  });

  it("does not display an equivalent for unrelated units or values below threshold", () => {
    expect(stockEquivalent(500, "kg")).toBe("");
    expect(stockEquivalent(500, "g")).toBe("");
    expect(stockEquivalent(12, "sac")).toBe("");
  });
});
