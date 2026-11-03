import { describe, expect, it } from "vitest";
import { fillTeams, teamStandings } from "@/lib/teams";

describe("mode équipes", () => {
  it("classe les équipes à la moyenne de leurs joueurs", () => {
    const standings = teamStandings(3, [
      { team: 0, score: 1000 },
      { team: 0, score: 0 },
      { team: 1, score: 600 },
      { team: 2, score: 500 },
      { team: 2, score: 500 },
      { team: 2, score: 500 },
    ]);
    expect(standings.map((t) => [t.name, t.score, t.rank, t.players])).toEqual([
      ["Les Citrons", 600, 1, 1],
      ["Les Éclairs", 500, 2, 2],
      ["Les Flamants", 500, 2, 3],
    ]);
    expect(standings[0].movement).toBeNull();
  });

  it("dit combien de places chaque équipe a gagnées", () => {
    const standings = teamStandings(
      2,
      [
        { team: 0, score: 900, priorScore: 100 },
        { team: 1, score: 500, priorScore: 400 },
      ],
      true,
    );
    expect(standings.map((t) => [t.name, t.movement])).toEqual([
      ["Les Éclairs", 1],
      ["Les Citrons", -1],
    ]);
  });

  it("place ceux qui n’ont pas choisi dans les équipes les moins remplies", () => {
    const placed = fillTeams(3, [
      { id: "a", team: 0 },
      { id: "b", team: 0 },
      { id: "c", team: 1 },
      { id: "d", team: null },
      { id: "e", team: null },
      { id: "f", team: 5 },
    ]);
    expect([...placed]).toEqual([
      ["d", 2],
      ["e", 1],
      ["f", 2],
    ]);
  });
});
