'use strict';

require('./chai/tree-visualizer-chai-extensions');
const expect = require("chai").expect;

const testObjects = require("./test-object-creator");

const visualizationStyles = testObjects.visualizationStyles;
const calculateTextWidth = testObjects.calculateTextWidth;
const appContext = require('./main-files').get('app-context').newInstance({visualizationStyles, calculateTextWidth});
const treeVisualizer = appContext.getTreeVisualizer();

// FIXME: Define (if unavoidable??) magic constants in one place
const CIRCLE_TEXT_PADDING = 5;
const radiusOfLeaf = leaf => calculateTextWidth(leaf.getName()) / 2 + CIRCLE_TEXT_PADDING;

const moveToMiddleOfParent = (node, parent) =>
  treeVisualizer.dragNode(node, parent.visualData.x - node.visualData.x, parent.visualData.y - node.visualData.y, false);

const calcDeltaToRightUpperCornerOfParent = (node, parent) => {
  const delta = (parent.visualData.r - node.visualData.r - 0.5) / Math.sqrt(2);
  return delta;
};

describe("Visual data of node", () => {
  it("adapts radius on folding to minimum radius on the same level", () => {
    const tree = testObjects.testTree2();

    const toFold = tree.getNode("com.tngtech.main");
    let expRadius = Math.min.apply(Math, [toFold.visualData.r, tree.getNode("com.tngtech.class2").visualData.r,
      tree.getNode("com.tngtech.class3").visualData.r, tree.getNode("com.tngtech.test").visualData.r]);
    toFold.changeFold();
    treeVisualizer.adaptToFoldState(toFold);

    expRadius = Math.max(radiusOfLeaf(toFold), expRadius);
    expect(toFold.visualData.r).to.equal(expRadius);
  });

  // FIXME: Why is this important? It looks fine, even if the radius is 4px off after fold and unfold
  xit("reset radius on unfolding", () => {
    const tree = testObjects.testTree2();

    const toFold = tree.getNode("com.tngtech.main");
    const expRadius = toFold.visualData.r;
    toFold.changeFold();
    treeVisualizer.adaptToFoldState(toFold);
    toFold.changeFold();
    treeVisualizer.adaptToFoldState(toFold);
    expect(toFold.visualData.r).to.equal(expRadius);
  });

  it("can be dragged", () => {
    const tree = testObjects.testTree2();

    const toDrag = tree.getNode("com.tngtech.class2");
    const dx = 1, dy = -3;
    const newX = toDrag.visualData.x + dx, newY = toDrag.visualData.y + dy;
    treeVisualizer.dragNode(toDrag, dx, dy, false);
    expect(toDrag.visualData.x).to.equal(newX);
    expect(toDrag.visualData.y).to.equal(newY);
  });

  it("drags also its children if it is dragged", () => {
    const tree = testObjects.testTree2();

    const allNodes2 = testObjects.allNodes(tree.root);
    const toDrag = tree.getNode("com.tngtech.test");
    const dx = 1, dy = -3;
    const exp = new Map();
    allNodes2.forEach(n => {
      const node = tree.getNode(n);
      const xy = [node.visualData.x, node.visualData.y];
      if (node.isChildOf(toDrag)) {
        xy[0] += dx;
        xy[1] += dy;
      }
      exp.set(n, xy);
    });
    treeVisualizer.dragNode(toDrag, dx, dy, false);
    expect(tree.root.getSelfAndDescendants()).to.haveExactlyPositions(exp);
  });

  it("cannot be dragged out of its parent", () => {
    const tree = testObjects.testTree2();

    const toDrag = tree.getNode("com.tngtech.test.subtest.subtestclass1");
    const parent = tree.getNode("com.tngtech.test.subtest");
    const dx = toDrag.visualData.x + parent.visualData.r, dy = 5;
    const newX = toDrag.visualData.x, newY = toDrag.visualData.y;
    treeVisualizer.dragNode(toDrag, dx, dy, false);
    expect(toDrag.visualData.x).to.equal(newX);
    expect(toDrag.visualData.y).to.equal(newY);
  });

  // FIXME: If I remove this, the graph looks fine, no bubbles wander outside of their parents or anything, what's the use of this??
  xit("is dragged automatically back into its parent on unfolding, so that it is compconstely within its parent", () => {
    const tree = testObjects.testTree2();

    const toDrag = tree.getNode("com.tngtech.test.subtest");
    const parent = tree.getNode("com.tngtech.test");

    const newDelta = (parent.visualData.r - toDrag.visualData.r) / Math.sqrt(2);

    moveToMiddleOfParent(toDrag, parent);

    const newX = toDrag.visualData.x + newDelta, newY = toDrag.visualData.y - newDelta;

    toDrag.changeFold();
    treeVisualizer.adaptToFoldState(toDrag);
    const delta = calcDeltaToRightUpperCornerOfParent(toDrag, parent);
    treeVisualizer.dragNode(toDrag, delta, -delta, false);
    toDrag.changeFold();
    treeVisualizer.adaptToFoldState(toDrag);

    expect(toDrag.visualData.x).to.be.within(newX - 2, newX + 2);
    expect(toDrag.visualData.y).to.be.within(newY - 2, newY + 2);
  });

  it("is not dragged automatically back into its parent on unfolding if its parent is the root", () => {
    const tree = testObjects.testTree2();

    const toDrag = tree.getNode("com.tngtech.test");
    const parent = tree.getNode("com.tngtech");

    moveToMiddleOfParent(toDrag, parent);

    const delta = calcDeltaToRightUpperCornerOfParent(toDrag, parent);
    const newX = toDrag.visualData.x + delta, newY = toDrag.visualData.y - delta;

    toDrag.changeFold();
    treeVisualizer.adaptToFoldState(toDrag);
    treeVisualizer.dragNode(toDrag, delta, -delta, false);
    toDrag.changeFold();
    treeVisualizer.adaptToFoldState(toDrag);

    expect(toDrag.visualData.x).to.be.within(newX - 2, newX + 2);
    expect(toDrag.visualData.y).to.be.within(newY - 2, newY + 2);
  });
});