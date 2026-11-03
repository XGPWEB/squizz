-- Wheel of fortune: the last spin of the current step, shared by every screen of the game.
ALTER TABLE "Room" ADD COLUMN "spin" JSONB;
