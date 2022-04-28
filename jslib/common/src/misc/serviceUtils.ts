import { ITreeNodeObject, TreeNode } from "../models/domain/treeNode";

export class ServiceUtils {
  static nestedTraverse(
    nodeTree: TreeNode<ITreeNodeObject>[],
    partIndex: number,
    parts: string[],
    obj: ITreeNodeObject,
    parent: ITreeNodeObject,
    delimiter: string
  ) {
    if (parts.length <= partIndex) {
      return;
    }

    const end = partIndex === parts.length - 1;
    const partName = parts[partIndex];

    for (let i = 0; i < nodeTree.length; i++) {
      if (nodeTree[i].node.name !== parts[partIndex]) {
        continue;
      }
      if (end && nodeTree[i].node.id !== obj.id) {
        // Another node with the same name.
        nodeTree.push(new TreeNode(obj, partName, parent));
        return;
      }
      ServiceUtils.nestedTraverse(
        nodeTree[i].children,
        partIndex + 1,
        parts,
        obj,
        nodeTree[i].node,
        delimiter
      );
      return;
    }

    if (nodeTree.filter((n) => n.node.name === partName).length === 0) {
      if (end) {
        nodeTree.push(new TreeNode(obj, partName, parent));
        return;
      }
      const newPartName = parts[partIndex] + delimiter + parts[partIndex + 1];
      ServiceUtils.nestedTraverse(
        nodeTree,
        0,
        [newPartName, ...parts.slice(partIndex + 2)],
        obj,
        parent,
        delimiter
      );
    }
  }

  static getTreeNodeObject(
    nodeTree: TreeNode<ITreeNodeObject>[],
    id: string
  ): TreeNode<ITreeNodeObject> {
    for (let i = 0; i < nodeTree.length; i++) {
      if (nodeTree[i].node.id === id) {
        return nodeTree[i];
      } else if (nodeTree[i].children != null) {
        const node = ServiceUtils.getTreeNodeObject(nodeTree[i].children, id);
        if (node !== null) {
          return node;
        }
      }
    }
    return null;
  }
}
