'use strict';

let jsonToRoot = require('./tree.js').jsonToRoot;
let jsonToDependencies = require('./dependencies.js').jsonToDependencies;

let Graph = class {
  constructor(root, nodeMap, dependencies) {
    this.root = root;
    this.nodeMap = nodeMap;
    this.dependencies = dependencies;
  }

  getVisibleNodes() {
    return this.root.getVisibleDescendants();
  }

  getVisibleDependencies() {
    return this.dependencies.getVisible();
  }

  changeFoldStateOfNode(node) {
    if (node.changeFold()) {
      this.dependencies.changeFold(node.getFullName(), node.isFolded());
      return true;
    }
    return false;
  }

  //FIXME: fold and do not change state only
  foldAllNodes() {
    this.root.recursiveCall(node => {
      if (!node.isRoot()) {
        if (node.fold()) {
          //FIXME: schöner machen AU-14
          this.dependencies.changeFold(node.getFullName(), node.isFolded());
        }
      }
    });
  }

  getDetailedDependenciesOf(from, to) {
    return this.dependencies.getDetailedDependenciesOf(from, to);
  }

  filterNodesByName(filterString, exclude) {
    this.root.filterByName(filterString, exclude);
    this.dependencies.setNodeFilters(this.root.getFilters());
  }

  filterNodesByType(filter) {
    this.root.filterByType(filter.showInterfaces, filter.showClasses, !filter.showEmptyPackages);
    this.dependencies.setNodeFilters(this.root.getFilters());
  }

  resetFilterNodesByType() {
    this.root.resetFilterByType();
    this.dependencies.setNodeFilters(this.root.getFilters());
  }

  filterDependenciesByKind() {
    return this.dependencies.filterByKind();
  }

  resetFilterDependenciesByKind() {
    this.dependencies.resetFilterByKind();
  }
};

let jsonToGraph = jsonRoot => {
  let root = jsonToRoot(jsonRoot);
  let nodeMap = new Map(root.getVisibleDescendants().map(node => [node.getFullName(), node]));
  let deps = jsonToDependencies(jsonRoot, nodeMap);
  return new Graph(root, nodeMap, deps);
};

module.exports.jsonToGraph = jsonToGraph;