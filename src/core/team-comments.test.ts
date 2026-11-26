import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PortalService } from "./portal-service";
import { memberName, mentionsFor, parseMentions, TEAM_COMMENT_MAX, TeamCommentError } from "./team-comments";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const CANE = "canela.r@weddinas.com";
const JULI = "juli@gmail.com";
const members = [CANE, JULI];

describe("mentions", () => {
  it("names a member after their email and finds @mentions by that name, ignoring case and accents", () => {
    expect(memberName(CANE)).toBe("Canela");
    expect(memberName(JULI)).toBe("Juli");
    expect(parseMentions("@canela mirá esto y avisale a @JULI. @nadie no existe", members)).toEqual([CANE, JULI]);
    expect(parseMentions("mail juli@gmail.com no es mención", members)).toEqual([]);
  });
});

describe("team comments", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-comments-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("notifies the mentioned members until they see it, and lists it as pending until they mark it done", async () => {
    await service.addTeamComment(coupleId, "catering", CANE, "@Juli confirmá el menú", members);
    let couples = await service.listCouples();
    expect(couples[0].teamComments).toMatchObject([{ blockKey: "catering", author: CANE, text: "@Juli confirmá el menú", mentions: [JULI], seenBy: [], doneBy: [] }]);

    const [mine] = mentionsFor(couples, JULI);
    expect(mine).toMatchObject({ coupleId, blockName: "Catering", seen: false, done: false });
    expect(mentionsFor(couples, CANE)).toEqual([]);

    await service.markMentionsSeen(JULI);
    await service.setMentionDone(coupleId, mine.comment.id, JULI, true);
    couples = await service.listCouples();
    expect(mentionsFor(couples, JULI)[0]).toMatchObject({ seen: true, done: true });
    await service.setMentionDone(coupleId, mine.comment.id, JULI, false);
    expect(mentionsFor(await service.listCouples(), JULI)[0].done).toBe(false);
  });

  it("only lets the author delete a comment, and rejects empty, too long or unknown-rubro comments", async () => {
    const comment = await service.addTeamComment(coupleId, "catering", CANE, "Hola", members);
    await expect(service.deleteTeamComment(coupleId, comment.id, JULI)).rejects.toThrow(TeamCommentError);
    await service.deleteTeamComment(coupleId, comment.id, CANE);
    expect((await service.getCouple(coupleId))!.teamComments).toEqual([]);
    await expect(service.addTeamComment(coupleId, "catering", CANE, "  ", members)).rejects.toThrow(TeamCommentError);
    await expect(service.addTeamComment(coupleId, "catering", CANE, "x".repeat(TEAM_COMMENT_MAX + 1), members)).rejects.toThrow(TeamCommentError);
    await expect(service.addTeamComment(coupleId, "nope", CANE, "Hola", members)).rejects.toThrow(TeamCommentError);
  });
});
