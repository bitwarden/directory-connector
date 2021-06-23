import { GroupResponse } from './groupResponse';
import { UserResponse } from './userResponse';

import { SimResult } from '../simResult';

import { BaseResponse } from 'jslib-node/cli/models/response/baseResponse';

export class TestResponse implements BaseResponse {
    object: string;
    groups: GroupResponse[] = [];
    enabledUsers: UserResponse[] = [];
    disabledUsers: UserResponse[] = [];
    deletedUsers: UserResponse[] = [];

    constructor(result: SimResult) {
        this.object = 'test';
        this.groups = result.groups != null ? result.groups.map(g => new GroupResponse(g)) : [];
        this.enabledUsers = result.enabledUsers != null ? result.enabledUsers.map(u => new UserResponse(u)) : [];
        this.disabledUsers = result.disabledUsers != null ? result.disabledUsers.map(u => new UserResponse(u)) : [];
        this.deletedUsers = result.deletedUsers != null ? result.deletedUsers.map(u => new UserResponse(u)) : [];
    }
}
