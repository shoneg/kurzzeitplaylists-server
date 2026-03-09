CREATE TABLE IF NOT EXISTS credentials(
    accessToken VARCHAR(500) NOT NULL,
    expiresAt DATETIME NOT NULL,
    refreshToken VARCHAR(300) NOT NULL,
    userId CHAR(25) NOT NULL,
    PRIMARY KEY(userId)
);
CREATE TABLE IF NOT EXISTS user(
    displayName VARCHAR(100) NOT NULL,
    spotifyId CHAR(25) NOT NULL,
    credentialsId CHAR(25) NOT NULL,
    PRIMARY KEY(spotifyId),
    -- CONSTRAINT CHECK (spotifyId = credentialsId),
    CONSTRAINT fkCredentials FOREIGN KEY(credentialsId) REFERENCES credentials(userId) On DELETE RESTRICT ON UPDATE CASCADE
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
CREATE TABLE IF NOT EXISTS playlist_aggregation(
    targetSpotifyId CHAR(25) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    PRIMARY KEY(targetSpotifyId),
    CONSTRAINT fkAggregationTarget FOREIGN KEY(targetSpotifyId) REFERENCES playlist(spotifyId) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS playlist_aggregation_source(
    targetSpotifyId CHAR(25) NOT NULL,
    sourceSpotifyId CHAR(25) NOT NULL,
    position INT NOT NULL,
    PRIMARY KEY(targetSpotifyId, sourceSpotifyId),
    UNIQUE KEY uniqTargetPosition(targetSpotifyId, position),
    CONSTRAINT fkAggregationSourceTarget FOREIGN KEY(targetSpotifyId) REFERENCES playlist_aggregation(targetSpotifyId) ON DELETE CASCADE ON UPDATE CASCADE
);
