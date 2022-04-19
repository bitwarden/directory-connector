import { OrganizationService as OrganizationServiceAbstraction } from "../abstractions/organization.service";
import { StateService } from "../abstractions/state.service";
import { OrganizationData } from "../models/data/organizationData";
import { Organization } from "../models/domain/organization";

export class OrganizationService implements OrganizationServiceAbstraction {
  constructor(private stateService: StateService) {}

  async get(id: string): Promise<Organization> {
    const organizations = await this.stateService.getOrganizations();
    // eslint-disable-next-line
    if (organizations == null || !organizations.hasOwnProperty(id)) {
      return null;
    }

    return new Organization(organizations[id]);
  }

  async getByIdentifier(identifier: string): Promise<Organization> {
    const organizations = await this.getAll();
    if (organizations == null || organizations.length === 0) {
      return null;
    }

    return organizations.find((o) => o.identifier === identifier);
  }

  async getAll(userId?: string): Promise<Organization[]> {
    const organizations = await this.stateService.getOrganizations({ userId: userId });
    const response: Organization[] = [];
    for (const id in organizations) {
      // eslint-disable-next-line
      if (organizations.hasOwnProperty(id) && !organizations[id].isProviderUser) {
        response.push(new Organization(organizations[id]));
      }
    }
    return response;
  }

  async save(organizations: { [id: string]: OrganizationData }) {
    return await this.stateService.setOrganizations(organizations);
  }

  async canManageSponsorships(): Promise<boolean> {
    const orgs = await this.getAll();
    return orgs.some(
      (o) => o.familySponsorshipAvailable || o.familySponsorshipFriendlyName !== null
    );
  }

  async hasOrganizations(userId?: string): Promise<boolean> {
    const organizations = await this.getAll(userId);
    return organizations.length > 0;
  }
}
