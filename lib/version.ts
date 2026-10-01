import pkg from "../package.json";

/** The version shown in the footers. It is read from package.json, so a version bump updates it everywhere. */
export const APP_VERSION: string = pkg.version;
