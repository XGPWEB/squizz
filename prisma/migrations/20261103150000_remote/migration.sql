-- Remote control of a game from the host's phone: the secret of its link.
ALTER TABLE "Room" ADD COLUMN "remoteToken" TEXT;
