'use strict';

require('./chai/tree-visualizer-chai-extensions');
require('./chai/dependencies-visualizer-chai-extensions');
const expect = require("chai").expect;

const testObjects = require("./test-object-creator.js");

const TEXT_WIDTH = n => n.length * 6;
const CIRCLE_TEXT_PADDING = 5;
const RELATIVE_TEXT_POSITION = 0.8;

const CIRCLE_PADDING = 10;
const packSiblings = require("../../../main/app/report/lib/d3.js").packSiblings;
const packEnclose = require("../../../main/app/report/lib/d3.js").packEnclose;

const visualizer = require("../../../main/app/report/graph-visualizer.js").visualizer;
visualizer.setStyles(TEXT_WIDTH, CIRCLE_TEXT_PADDING, RELATIVE_TEXT_POSITION);

describe("Visualizer", () => {
  it("visualizes the tree and the dependencies correctly", () => {
    let graphWrapper = testObjects.testGraph2();
    visualizer.visualizeGraph(graphWrapper.graph, packSiblings, packEnclose, CIRCLE_PADDING);
    let checkLayout = node => {
      expect(node).to.haveTextWithinCircle(TEXT_WIDTH, CIRCLE_TEXT_PADDING, RELATIVE_TEXT_POSITION);
      expect(node).to.haveChildrenWithinCircle(CIRCLE_PADDING);
      expect(node.origChildren).to.doNotOverlap(CIRCLE_PADDING);
      node.origChildren.forEach(c => checkLayout(c));
    };
    checkLayout(graphWrapper.graph.root);
    expect(graphWrapper.graph.getVisibleDependencies()).to.haveCorrectEndPositions();
  });
});