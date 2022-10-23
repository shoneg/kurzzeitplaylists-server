import { Profile } from "passport-spotify";

export type MyUser = {
    profile: Profile;
    accessToken: string;
    refreshToken: string;
}