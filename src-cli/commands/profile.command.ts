import { StateService } from "@/libs/abstractions/state.service";

import { Response } from "@/src-cli/models/response";
import { ListResponse } from "@/src-cli/models/response/listResponse";
import { MessageResponse } from "@/src-cli/models/response/messageResponse";
import { StringResponse } from "@/src-cli/models/response/stringResponse";

/**
 * Manages the multiple saved directory-connector configurations ("profiles") that can live
 * side by side in `data.json`. Exactly one profile is "active" at a time - it's the one that
 * `bwdc config`/`bwdc sync` read and write.
 */
export class ProfileCommand {
  constructor(private stateService: StateService) {}

  async list(): Promise<Response> {
    try {
      const profiles = await this.stateService.getDirectoryProfiles();
      const activeId = await this.stateService.getActiveDirectoryProfileId();
      const data = profiles.map((p) => ({
        object: "profile",
        id: p.id,
        name: p.name,
        active: p.id === activeId,
        directoryType: p.directoryType ?? null,
        organizationId: p.organizationId ?? null,
      }));
      return Response.success(new ListResponse(data));
    } catch (e) {
      return Response.error(e);
    }
  }

  async create(name: string): Promise<Response> {
    if (name == null || name.trim() === "") {
      return Response.badRequest("A profile name is required.");
    }
    try {
      const id = await this.stateService.createDirectoryProfile(name);
      return Response.success(
        new MessageResponse(`Created and switched to profile '${name}'.`, id),
      );
    } catch (e) {
      return Response.error(e);
    }
  }

  async use(idOrName: string): Promise<Response> {
    try {
      const id = await this.resolveId(idOrName);
      if (id == null) {
        return Response.badRequest("Unknown profile.");
      }
      await this.stateService.switchDirectoryProfile(id);
      return Response.success(new MessageResponse("Switched active profile.", id));
    } catch (e) {
      return Response.error(e);
    }
  }

  async rename(idOrName: string, newName: string): Promise<Response> {
    if (newName == null || newName.trim() === "") {
      return Response.badRequest("A new profile name is required.");
    }
    try {
      const id = await this.resolveId(idOrName);
      if (id == null) {
        return Response.badRequest("Unknown profile.");
      }
      await this.stateService.renameDirectoryProfile(id, newName);
      return Response.success(new MessageResponse(`Renamed profile to '${newName}'.`, null));
    } catch (e) {
      return Response.error(e);
    }
  }

  async delete(idOrName: string): Promise<Response> {
    try {
      const id = await this.resolveId(idOrName);
      if (id == null) {
        return Response.badRequest("Unknown profile.");
      }
      await this.stateService.deleteDirectoryProfile(id);
      return Response.success(new MessageResponse("Deleted profile.", null));
    } catch (e) {
      return Response.error(e);
    }
  }

  async current(): Promise<Response> {
    try {
      const id = await this.stateService.getActiveDirectoryProfileId();
      return Response.success(new StringResponse(id));
    } catch (e) {
      return Response.error(e);
    }
  }

  private async resolveId(idOrName: string): Promise<string> {
    if (idOrName == null || idOrName.trim() === "") {
      return null;
    }
    const profiles = await this.stateService.getDirectoryProfiles();
    const byId = profiles.find((p) => p.id === idOrName);
    if (byId != null) {
      return byId.id;
    }
    const byName = profiles.find((p) => p.name === idOrName);
    return byName?.id ?? null;
  }
}
