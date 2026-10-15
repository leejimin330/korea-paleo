import { describe, expect, it } from "vitest";
import { josa } from "./josa";

describe("josa", () => {
  it("picks by final consonant", () => {
    expect(josa("고라니", "과", "와")).toBe("고라니와");
    expect(josa("반달가슴곰", "과", "와")).toBe("반달가슴곰과");
    expect(josa("「메갈로돈 이빨 화석」", "은", "는")).toBe("「메갈로돈 이빨 화석」은");
    expect(josa("「태백 앵무조개류 화석」", "은", "는")).toBe("「태백 앵무조개류 화석」은");
    expect(josa("「코리아살티페스」", "은", "는")).toBe("「코리아살티페스」는");
  });
});
