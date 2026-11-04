import changelog from "../../../CHANGELOG.md?raw";
import { parseChangelog } from "./changelog";

export const releases = parseChangelog(changelog);
