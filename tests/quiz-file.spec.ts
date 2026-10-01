import { describe, expect, it } from "vitest";
import { MAX_TRANSFER_FILE_BYTES, MAX_TRANSFER_MEDIA_BYTES, assignRefs } from "@/lib/quiz-file";

describe("références des médias d’un fichier .squizz", () => {
  it("donne une référence par média distinct, dans l’ordre d’apparition", () => {
    expect([...assignRefs(["a", "b", "c"])]).toEqual([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
    ]);
  });

  it("réutilise la référence d’un média répété et ignore les liens externes", () => {
    const refs = assignRefs(["a", "", "b", "a", "", "c", "b"]);
    expect(refs.size).toBe(3);
    expect(new Set(refs.values()).size).toBe(3);
    expect(refs.get("a")).toBe("1");
    expect(refs.get("c")).toBe("3");
  });

  it("garde un plafond de médias qui tient, en base64, dans le fichier accepté à l’import", () => {
    expect(Math.ceil(MAX_TRANSFER_MEDIA_BYTES / 3) * 4).toBeLessThan(MAX_TRANSFER_FILE_BYTES);
  });
});
