import { describe, expect, it } from "vitest";
import { formatCop } from "../money";

describe("formatCop", () => {
  it("formats COP integers without decimals using es-CO separators", () => {
    expect(formatCop(166500)).toBe("$166.500 COP");
    expect(formatCop(162800)).toBe("$162.800 COP");
    expect(formatCop(154000)).toBe("$154.000 COP");
    expect(formatCop(144500)).toBe("$144.500 COP");
    expect(formatCop(220000)).toBe("$220.000 COP");
  });

  it("handles zero and non-finite inputs safely", () => {
    expect(formatCop(0)).toBe("$0 COP");
    expect(formatCop(Number.NaN)).toBe("$0 COP");
  });
});
