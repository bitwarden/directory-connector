import { OrganizationData } from "../models/data/organizationData";
import { Organization } from "../models/domain/organization";

export abstract class OrganizationService {
  get: (id: string) => Promise<Organization>;
  getByIdentifier: (identifier: string) => Promise<Organization>;
  getAll: (userId?: string) => Promise<Organization[]>;
  save: (orgs: { [id: string]: OrganizationData }) => Promise<any>;
  canManageSponsorships: () => Promise<boolean>;
  hasOrganizations: (userId?: string) => Promise<boolean>;
}
