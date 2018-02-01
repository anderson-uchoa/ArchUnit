'use strict';

const dependencyKinds = require('./dependency-kinds.json');
const nodeKinds = require('./node-kinds.json');
const createDependencyBuilder = require('./dependency.js').buildDependency;
let buildDependency;

let nodes = new Map();

const fullnameSeparators = {
  packageSeparator: ".",
  classSeparator: "$"
};

const startsWithFullnameSeparator = string => string.startsWith(fullnameSeparators.packageSeparator) || string.startsWith(fullnameSeparators.classSeparator);

const filter = dependencies => ({
  by: propertyFunc => ({
    startsWith: prefix => dependencies.filter(r => {
      const property = propertyFunc(r);
      if (property.startsWith(prefix)) {
        const rest = property.substring(prefix.length);
        return rest ? startsWithFullnameSeparator(rest) : true;
      }
      else {
        return false;
      }
    }),
    equals: fullName => dependencies.filter(r => propertyFunc(r) === fullName)
  })
});


const unique = dependencies => {
  const tmp = Array.from(dependencies.map(r => [`${r.from}->${r.to}`, r]));
  const map = new Map();
  tmp.forEach(e => {
    if (map.has(e[0])) {
      const old = map.get(e[0]);
      const newDep = buildDependency(e[1].from, e[1].to).withMergedDescriptions(old.description, e[1].description);
      map.set(e[0], newDep);
    }
    else {
      map.set(e[0], e[1]);
    }
  });
  return [...map.values()];
};

const transform = dependencies => ({
  where: propertyFunc => ({
    startsWith: prefix => ({
      eliminateSelfDeps: yes => ({
        to: transformer => {
          const matching = filter(dependencies).by(propertyFunc).startsWith(prefix);
          const rest = dependencies.filter(r => !matching.includes(r));
          let folded = unique(matching.map(transformer));
          if (yes) {
            folded = folded.filter(r => r.from !== r.to);
          }
          return [...rest, ...folded];
        }
      })
    })
  })
});


const foldTransformer = foldedElement => {
  return dependencies => {
    const targetFolded = transform(dependencies).where(r => r.to).startsWith(foldedElement).eliminateSelfDeps(false)
      .to(r => (
        buildDependency(r.from, foldedElement).withExistingDescription(r.description).whenTargetIsFolded(r.to)));
    return transform(targetFolded).where(r => r.from).startsWith(foldedElement).eliminateSelfDeps(true)
      .to(r => (
        buildDependency(foldedElement, r.to).withExistingDescription(r.description).whenStartIsFolded(r.from)));
  }
};

const recalculateVisible = (transformers, dependencies) => Array.from(transformers)
  .reduce((mappedDependencies, transformer) => transformer(mappedDependencies), dependencies);

const recreateVisible = dependencies => {
  const after = recalculateVisible(dependencies._transformers.values(), dependencies._uniqued);
  dependencies.setVisibleDependencies(after);
};

const changeFold = (dependencies, callback) => {
  callback(dependencies);
  recreateVisible(dependencies);
};

const reapplyFilters = (dependencies, filters) => {
  dependencies._filtered = Array.from(filters).reduce((filtered_deps, filter) => filter(filtered_deps),
    dependencies._all);
  dependencies._uniqued = unique(Array.from(dependencies._filtered));
  recreateVisible(dependencies);
  dependencies.observers.forEach(f => f(dependencies.getVisible()));
};

const newFilters = (dependencies) => ({
  typeFilter: null,
  nameFilter: null,

  apply: function () {
    reapplyFilters(dependencies, this.values());
  },

  values: function () {
    return [this.typeFilter, this.nameFilter].filter(f => !!f); // FIXME: We should not pass this object around to other modules (this is the reason for the name for now)
  }
});

const Dependencies = class {
  constructor(all) {
    this._transformers = new Map();
    this._all = all;
    this._filtered = this._all;
    this._uniqued = unique(Array.from(this._filtered));
    this.setVisibleDependencies(this._uniqued);
    this.observers = [];
    this._filters = newFilters(this);
  }

  addObserver(observerFunction) {
    this.observers.push(observerFunction);
  }

  setVisibleDependencies(deps) {
    this._visibleDependencies = deps;
    this._visibleDependencies.forEach(d => d.mustShareNodes =
      this._visibleDependencies.filter(e => e.from === d.to && e.to === d.from).length > 0);
  }

  changeFold(foldedElement, isFolded) {
    if (isFolded) {
      changeFold(this, dependencies => dependencies._transformers.set(foldedElement, foldTransformer(foldedElement)));
    }
    else {
      changeFold(this, dependencies => dependencies._transformers.delete(foldedElement));
    }
  }

  setNodeFilters(filters) {
    this._filters.nameFilter = filtered_deps => Array.from(filters.values()).reduce((deps, filter) =>
      deps.filter(d => filter(nodes.getByName(d.from)) && filter(nodes.getByName(d.to))), filtered_deps);
    this._filters.apply();
  }

  filterByKind(typeFilterConfig) {
    const kindFilter = dependency => {
      const type = dependency.description.getDependencyTypesAsString();
      return (type !== dependencyKinds.allDependencies.implements || typeFilterConfig.showImplementing)
        && ((type !== dependencyKinds.allDependencies.extends || typeFilterConfig.showExtending))
        && ((type !== dependencyKinds.allDependencies.constructorCall || typeFilterConfig.showConstructorCall))
        && ((type !== dependencyKinds.allDependencies.methodCall || typeFilterConfig.showMethodCall))
        && ((type !== dependencyKinds.allDependencies.fieldAccess || typeFilterConfig.showFieldAccess))
        && ((type !== dependencyKinds.allDependencies.implementsAnonymous || typeFilterConfig.showAnonymousImplementation))
        && ((dependency.getStartNode().getParent() !== dependency.getEndNode()
        && dependency.getEndNode().getParent() !== dependency.getStartNode())
        || typeFilterConfig.showDependenciesBetweenClassAndItsInnerClasses);
    };
    this._filters.typeFilter = dependencies => dependencies.filter(kindFilter);
    this._filters.apply();
  }

  resetFilterByKind() {
    this._filters.typeFilter = null;
    this._filters.apply();
  }

  getVisible() {
    return this._visibleDependencies;
  }

  getDetailedDependenciesOf(from, to) {
    const getDetailedDependenciesMatching = (dependencies, propertyFunc, depEnd) => {
      const matching = filter(dependencies).by(propertyFunc);
      const startNode = nodes.getByName(depEnd);
      if (startNode.isPackage() || startNode.isCurrentlyLeaf()) {
        return matching.startsWith(depEnd);
      }
      else {
        return matching.equals(depEnd);
      }
    };
    const startMatching = getDetailedDependenciesMatching(this._filtered, d => d.from, from);
    let targetMatching = getDetailedDependenciesMatching(startMatching, d => d.to, to);
    targetMatching = targetMatching.filter(d => d.description.hasTitle());
    const detailedDeps = targetMatching.map(d => ({
      description: d.getDescriptionRelativeToPredecessors(from, to),
      cssClass: d.getClass()
    }));
    const map = new Map();
    detailedDeps.forEach(d => map.set(d.description, d));
    return [...map.values()];
  }
};

const addDependenciesOf = dependencyGroup => ({
  ofJsonElement: jsonElement => ({
    toArray: arr => {
      dependencyGroup.kinds.forEach(kind => {
        if (jsonElement.hasOwnProperty(kind.name)) {
          if (kind.isUnique && jsonElement[kind.name]) {
            arr.push(buildDependency(jsonElement.fullName, jsonElement[kind.name]).withNewDescription()
              .withKind(dependencyGroup.name, kind.dependency).build());
          }
          else if (!kind.isUnique && jsonElement[kind.name].length !== 0) {
            jsonElement[kind.name].forEach(d => arr.push(
              buildDependency(jsonElement.fullName, d.target || d).withNewDescription().withKind(dependencyGroup.name, kind.dependency).withStartCodeUnit(d.startCodeUnit)
                .withTargetElement(d.targetCodeElement).build()));
          }
        }
      });
    }
  })
});

const addAllDependenciesOfJsonElement = jsonElement => ({
  toArray: arr => {
    if (jsonElement.type !== nodeKinds.package) {
      const groupedDependencies = dependencyKinds.groupedDependencies;
      addDependenciesOf(groupedDependencies.inheritance).ofJsonElement(jsonElement).toArray(arr);
      addDependenciesOf(groupedDependencies.access).ofJsonElement(jsonElement).toArray(arr);
    }

    if (jsonElement.hasOwnProperty("children")) {
      jsonElement.children.forEach(c => addAllDependenciesOfJsonElement(c).toArray(arr));
    }
  }
});

const jsonToDependencies = (jsonRoot, nodeMap) => {
  const arr = [];
  nodes = nodeMap;
  buildDependency = createDependencyBuilder(nodeMap);
  addAllDependenciesOfJsonElement(jsonRoot).toArray(arr);
  return new Dependencies(arr);
};

module.exports.jsonToDependencies = jsonToDependencies;