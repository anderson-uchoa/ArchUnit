'use strict';

const predicates = require('./predicates');
const nodeKinds = require('./node-kinds.json');
const Vector = require('./vectors').Vector;

const init = (NodeText, visualizationFunctions, visualizationStyles, jsonToDependencies) => {

  const packCirclesAndReturnEnclosingCircle = visualizationFunctions.packCirclesAndReturnEnclosingCircle;
  const calculateDefaultRadius = visualizationFunctions.calculateDefaultRadius;

  const NodeDescription = class {
    constructor(name, fullName, type) {
      this.name = name;
      this.fullName = fullName;
      this.type = type;
    }
  };

  const fold = (node, folded) => {
    if (!node.isLeaf()) {
      node._folded = folded;
      return true;
    }
    return false;
  };

  const getRoot = node => {
    let root = node;
    while (root._parent) {
      root = root._parent;
    }
    return root;
  };

  const getDependencies = node => {
    return getRoot(node)._dependencies;
  };

  const VisualData = class {
    constructor(x = 0, y = 0, r = 0) {
      this.x = x;
      this.y = y;
      this.r = r;
    }

    // FIXME: It would appear smoother, if we would shorten dx and dy to the minimal possible delta, if otherwise we would end up outside of the parent
    move(dx, dy, parent, callback) {
      const newX = this.x + dx;
      const newY = this.y + dy;
      const centerDistance = Vector.between({x: newX, y: newY}, parent.getCoords()).length();
      const insideOfParent = centerDistance + this.r <= parent.getRadius();
      if (parent.isRoot() || insideOfParent) {
        this.x = newX;
        this.y = newY;
        callback();
      }
    }

    update(x, y, r) {
      this.x = x;
      this.y = y;
      if (r) {
        this.r = r;
      }
    }
  };

  const newFilters = (root) => ({
    typeFilter: null,
    nameFilter: null,

    apply: function () {
      root.resetFiltering();
      const applyFilter = (node, filters) => {
        node._filteredChildren = filters.reduce((childrenSoFar, filter) => childrenSoFar.filter(filter), node._filteredChildren);
        node._filteredChildren.forEach(c => applyFilter(c, filters));
      };
      applyFilter(root, this.values());
    },

    values: function () {
      return [this.typeFilter, this.nameFilter].filter(f => !!f); // FIXME: We should not pass this object around to other modules (this is the reason for the name for now)
    }
  });

  const Node = class {
    constructor(jsonNode) {
      this._description = new NodeDescription(jsonNode.name, jsonNode.fullName, jsonNode.type);

      this._originalChildren = Array.from(jsonNode.children || []).map(jsonChild => new Node(jsonChild));
      this._originalChildren.forEach(c => c._parent = this);

      this._filteredChildren = this._originalChildren;
      this._folded = false;
      this._filters = newFilters(this);

      this.visualData = new VisualData();
      this._text = new NodeText(this);

      if (this.isRoot()) {
        this.relayout();
      }
    }

    isPackage() {
      return this.getType() === nodeKinds.package;
    }

    isInterface() {
      return this.getType() === nodeKinds.interface;
    }

    getName() {
      return this._description.name;
    }

    getFullName() {
      return this._description.fullName;
    }

    getText() {
      return this._text;
    }

    getType() {
      return this._description.type;
    }

    getParent() {
      return this._parent;
    }

    getOriginalChildren() {
      return this._originalChildren;
    }

    getCurrentChildren() {
      return this._folded ? [] : this._filteredChildren;
    }

    isRoot() {
      return !this._parent;
    }

    isLeaf() {
      return this._filteredChildren.length === 0;
    }

    isCurrentlyLeaf() {
      return this.isLeaf() || this._folded;
    }

    isChildOf(node) {
      if (node === this) {
        return true; // FIXME: Why does a method called 'isChildOf' return true for the node itself??
      }
      return node.getDescendants().indexOf(this) !== -1;
    }

    isFolded() {
      return this._folded;
    }

    fold() {
      const wasFolded = fold(this, true);
      if (wasFolded) {
        getDependencies(this).changeFold(this.getFullName(), this.isFolded());
      }
      return wasFolded;
    }

    changeFold() {
      const foldChanged = fold(this, !this._folded);
      if (foldChanged) {
        getDependencies(this).changeFold(this.getFullName(), this.isFolded());
        getRoot(this).relayout();
      }
      return foldChanged;
    }

    getFilters() {
      return this._filters;
    }

    getClass() {
      const foldableStyle = this.isLeaf() ? "not-foldable" : "foldable";
      return `node ${this.getType()} ${foldableStyle}`;
    }

    getSelfAndDescendants() {
      return [this, ...this.getDescendants()];
    }

    getVisibleDependencies() {
      return getDependencies(this).getVisible();
    }

    getDescendants() {
      const result = [];
      this.getCurrentChildren().forEach(child => child.callOnSelfThenEveryDescendant(node => result.push(node)));
      return result;
    }

    callOnSelfThenEveryDescendant(fun) {
      fun(this);
      this.getCurrentChildren().forEach(c => c.callOnSelfThenEveryDescendant(fun));
    }

    callOnEveryDescendantThenSelf(fun) {
      this.getCurrentChildren().forEach(c => c.callOnEveryDescendantThenSelf(fun));
      fun(this);
    }

    /**
     * @param predicate A predicate (i.e. function Node -> boolean)
     * @return true, iff this Node or any child (after filtering) matches the predicate
     */
    matchesOrHasChildThatMatches(predicate) {
      return predicate(this) || this._filteredChildren.some(node => node.matchesOrHasChildThatMatches(predicate));
    }

    getX() {
      return this.visualData.x;
    }

    getY() {
      return this.visualData.y;
    }

    getRadius() {
      return this.visualData.r;
    }

    getCoords() {
      return {x: this.getX(), y: this.getY()};
    }

    /**
     * We go bottom to top through the tree, always creating a circle packing of the children and an enclosing
     * circle around those for the current node. The coordinates of the circle of any node will be shifted, when
     * the next higher circle packing is created, thus the coordinates of the children run out of sync (we would
     * have to adjust those recursively in every step, wasting performance).
     * We'll fix this in _finishLayout().
     *
     * @private
     */
    _prepareLayout() {
      this.getCurrentChildren().forEach(d => d._prepareLayout());

      if (this.isCurrentlyLeaf()) {
        this.visualData.update(0, 0, calculateDefaultRadius(this));
      } else if (this.getCurrentChildren().length === 1) {
        const onlyChild = this.getCurrentChildren()[0];
        this.visualData.update(onlyChild.getX(), onlyChild.getY(), 3 * onlyChild.getRadius());
      } else {
        const childCircles = this.getCurrentChildren().map(c => c.visualData);
        const circle = packCirclesAndReturnEnclosingCircle(childCircles, visualizationStyles.getCirclePadding());
        const r = Math.max(circle.r, calculateDefaultRadius(this));
        this.visualData.update(circle.x, circle.y, r);
      }
    }

    /**
     * We need to recursively shift the circle packings back in place (that went out of sync, stepping backwards
     * through the tree in _prepareLayout() )
     *
     * @private
     */
    _finishLayout() {
      this.getCurrentChildren().forEach(child => {
        child.visualData.update(child.getParent().getX() + child.getX(), child.getParent().getY() + child.getY());
        child._finishLayout();
      });
    }

    relayout() {
      this._prepareLayout();

      if (this.isRoot()) {
        this.visualData.update(this.getRadius(), this.getRadius()); // Shift root to the middle
      }

      this._finishLayout();
    }

    /**
     * Shifts this node and its children.
     *
     * @param dx The delta in x-direction
     * @param dy The delta in y-direction
     */
    drag(dx, dy) {
      this.visualData.move(dx, dy, this.getParent(), () => this.getOriginalChildren().forEach(node => node.drag(dx, dy)));
    }

    resetFiltering() {
      this.getOriginalChildren().forEach(node => node.resetFiltering());
      this._filteredChildren = this.getOriginalChildren();
    }

    /**
     * Hides all nodes that don't contain the supplied filterString.
     *
     * @param nodeNameSubstring The node's full name needs to contain this text, to pass the filter. '*' matches any number of arbitrary characters.
     * @param exclude If true, the condition is inverted, i.e. nodes with names not containing the string will pass the filter.
     */
    filterByName(nodeNameSubstring, exclude) {
      const stringContainsSubstring = predicates.stringContains(nodeNameSubstring);
      const stringPredicate = exclude ? predicates.not(stringContainsSubstring) : stringContainsSubstring;
      const nodeNameSatisfies = stringPredicate => node => stringPredicate(node.getFullName());

      this._filters.nameFilter = node => node.matchesOrHasChildThatMatches(nodeNameSatisfies(stringPredicate));
      this._filters.apply();
      getDependencies(this).setNodeFilters(getRoot(this).getFilters());
    }

    filterByType(showInterfaces, showClasses) {
      let predicate = node => !node.isPackage();
      predicate = showInterfaces ? predicate : predicates.and(predicate, node => !node.isInterface());
      predicate = showClasses ? predicate : predicates.and(predicate, node => node.isInterface());

      this._filters.typeFilter = node => node.matchesOrHasChildThatMatches(predicate);
      this._filters.apply();
      getDependencies(this).setNodeFilters(getRoot(this).getFilters());
    }

    resetFilterByType() {
      this._filters.typeFilter = null;
      this._filters.apply();
      getDependencies(this).setNodeFilters(getRoot(this).getFilters());
    }
  };

  return jsonRoot => {
    const root = new Node(jsonRoot);

    const map = new Map();
    root.callOnSelfThenEveryDescendant(n => map.set(n.getFullName(), n));
    root.getByName = name => map.get(name);

    root._dependencies = jsonToDependencies(jsonRoot, root);
    root.getDetailedDependenciesOf = (from, to) => root._dependencies.getDetailedDependenciesOf(from, to);
    root.filterDependenciesByKind = () => root._dependencies.filterByKind();
    root.resetFilterDependenciesByKind = () => root._dependencies.resetFilterByKind();

    return root;
  };
};

module.exports.init = (NodeText, visualizationFunctions, visualizationStyles, jsonToDependencies) => {
  return {
    jsonToRoot: init(NodeText, visualizationFunctions, visualizationStyles, jsonToDependencies)
  };
};