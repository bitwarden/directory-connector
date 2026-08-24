import type { Jsonify } from "type-fest";

import type { GroupEntry } from "@/libs/models/groupEntry";
import type { UserEntry } from "@/libs/models/userEntry";

export class RendererSyncService {
  run(
    force: boolean,
    test: boolean,
  ): Promise<[Jsonify<GroupEntry>[] | null, Jsonify<UserEntry>[] | null]> {
    return ipc.sync.run(force, test);
  }
}
