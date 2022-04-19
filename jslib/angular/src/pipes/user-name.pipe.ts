import { Pipe, PipeTransform } from "@angular/core";

interface User {
  name?: string;
  email: string;
}

@Pipe({
  name: "userName",
})
export class UserNamePipe implements PipeTransform {
  transform(user?: User): string {
    if (user == null) {
      return null;
    }

    return user.name == null || user.name.trim() === "" ? user.email : user.name;
  }
}
