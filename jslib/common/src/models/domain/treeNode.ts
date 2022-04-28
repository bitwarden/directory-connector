export class TreeNode<T extends ITreeNodeObject> {
  parent: T;
  node: T;
  children: TreeNode<T>[] = [];

  constructor(node: T, name: string, parent: T) {
    this.parent = parent;
    this.node = node;
    this.node.name = name;
  }
}

export interface ITreeNodeObject {
  id: string;
  name: string;
}
