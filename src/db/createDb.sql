CREATE TABLE IF NOT EXISTS user(
    accessToken CHAR(240) NOT NULL,
    displayName VARCHAR(100) NOT NULL,
    expiresAt DATETIME NOT NULL,
    refreshToken CHAR(131) NOT NULL,
    spotifyId CHAR(25) NOT NULL,
    PRIMARY KEY(spotifyId)
);
CREATE TABLE IF NOT EXISTS playlist(
    discardPlaylist CHAR(25),
    maxTrackAge INT,
    maxTracks INT,
    name VARCHAR(100),
    numberOfTracks INT NOT NULL CHECK(numberOfTracks >= 0),
    oldestTrack DATETIME NOT NULL,
    owner CHAR(25) NOT NULL,
    spotifyId CHAR(25) NOT NULL,
    PRIMARY KEY(spotifyId),
    CONSTRAINT fkDiscardPlaylist FOREIGN KEY(discardPlaylist) REFERENCES playlist(spotifyId) ON DELETE
    SET NULL ON UPDATE CASCADE,
        CONSTRAINT fkUser FOREIGN KEY(owner) REFERENCES user(spotifyId) ON DELETE CASCADE ON UPDATE CASCADE
);