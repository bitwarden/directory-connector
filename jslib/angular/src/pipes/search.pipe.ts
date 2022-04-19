import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "search",
})
export class SearchPipe implements PipeTransform {
  transform(
    items: any[],
    searchText: string,
    prop1?: string,
    prop2?: string,
    prop3?: string
  ): any[] {
    if (items == null || items.length === 0) {
      return [];
    }

    if (searchText == null || searchText.length < 2) {
      return items;
    }

    searchText = searchText.trim().toLowerCase();
    return items.filter((i) => {
      if (
        prop1 != null &&
        i[prop1] != null &&
        i[prop1].toString().toLowerCase().indexOf(searchText) > -1
      ) {
        return true;
      }
      if (
        prop2 != null &&
        i[prop2] != null &&
        i[prop2].toString().toLowerCase().indexOf(searchText) > -1
      ) {
        return true;
      }
      if (
        prop3 != null &&
        i[prop3] != null &&
        i[prop3].toString().toLowerCase().indexOf(searchText) > -1
      ) {
        return true;
      }
      return false;
    });
  }
}
