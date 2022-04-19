import { ApiService } from "../abstractions/api.service";
import { CipherService } from "../abstractions/cipher.service";
import { EventService as EventServiceAbstraction } from "../abstractions/event.service";
import { LogService } from "../abstractions/log.service";
import { OrganizationService } from "../abstractions/organization.service";
import { StateService } from "../abstractions/state.service";
import { EventType } from "../enums/eventType";
import { EventData } from "../models/data/eventData";
import { EventRequest } from "../models/request/eventRequest";

export class EventService implements EventServiceAbstraction {
  private inited = false;

  constructor(
    private apiService: ApiService,
    private cipherService: CipherService,
    private stateService: StateService,
    private logService: LogService,
    private organizationService: OrganizationService
  ) {}

  init(checkOnInterval: boolean) {
    if (this.inited) {
      return;
    }

    this.inited = true;
    if (checkOnInterval) {
      this.uploadEvents();
      setInterval(() => this.uploadEvents(), 60 * 1000); // check every 60 seconds
    }
  }

  async collect(
    eventType: EventType,
    cipherId: string = null,
    uploadImmediately = false
  ): Promise<any> {
    const authed = await this.stateService.getIsAuthenticated();
    if (!authed) {
      return;
    }
    const organizations = await this.organizationService.getAll();
    if (organizations == null) {
      return;
    }
    const orgIds = new Set<string>(organizations.filter((o) => o.useEvents).map((o) => o.id));
    if (orgIds.size === 0) {
      return;
    }
    if (cipherId != null) {
      const cipher = await this.cipherService.get(cipherId);
      if (cipher == null || cipher.organizationId == null || !orgIds.has(cipher.organizationId)) {
        return;
      }
    }
    let eventCollection = await this.stateService.getEventCollection();
    if (eventCollection == null) {
      eventCollection = [];
    }
    const event = new EventData();
    event.type = eventType;
    event.cipherId = cipherId;
    event.date = new Date().toISOString();
    eventCollection.push(event);
    await this.stateService.setEventCollection(eventCollection);
    if (uploadImmediately) {
      await this.uploadEvents();
    }
  }

  async uploadEvents(userId?: string): Promise<any> {
    const authed = await this.stateService.getIsAuthenticated({ userId: userId });
    if (!authed) {
      return;
    }
    const eventCollection = await this.stateService.getEventCollection({ userId: userId });
    if (eventCollection == null || eventCollection.length === 0) {
      return;
    }
    const request = eventCollection.map((e) => {
      const req = new EventRequest();
      req.type = e.type;
      req.cipherId = e.cipherId;
      req.date = e.date;
      return req;
    });
    try {
      await this.apiService.postEventsCollect(request);
      this.clearEvents(userId);
    } catch (e) {
      this.logService.error(e);
    }
  }

  async clearEvents(userId?: string): Promise<any> {
    await this.stateService.setEventCollection(null, { userId: userId });
  }
}
