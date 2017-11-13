'use strict';

const createVisualizationStylesStub = (circlePadding = 1, nodeFontSize = 10) => {
  let _circlePadding = circlePadding;
  let _nodeFontSize = nodeFontSize;
  return {
    getCirclePadding: () => _circlePadding,
    setCirclePadding: padding => _circlePadding = padding,
    getNodeFontSize: () => _nodeFontSize,
    setNodeFontSize: fontSize => _nodeFontSize = fontSize
  };
};

const calculateTextWidthStub = text => text.length * 7;

const NodeViewStub = class {
  constructor() {
    this.cssClass = '';
    this.isVisible = true;
    this.show = () => this.isVisible = true;
    this.hide = () => this.isVisible = false;
    this.jumpToPosition = () => {
    };
    this.moveToPosition = () => Promise.resolve();
    this.moveToRadius = () => Promise.resolve();
    this.updateNodeType = cssClass => this.cssClass = cssClass;
    this.showIfVisible = node => {
      if (node.isVisible()) {
        this.isVisible = true;
      }
    };
  }
};

const createNodeListenerStub = () => {
  let _onDragWasCalled = false;
  let _foldedNode;
  let _onLayoutChangedWasCalled = false;
  return {
    onDrag: () => _onDragWasCalled = true,
    onFold: node => _foldedNode = node,
    onLayoutChanged: () => _onLayoutChangedWasCalled = true,
    onDragWasCalled: () => _onDragWasCalled,
    foldedNode: () => _foldedNode,
    onLayoutChangedWasCalled: () => _onLayoutChangedWasCalled
  }
};

module.exports = {
  visualizationStylesStub: createVisualizationStylesStub,
  calculateTextWidthStub: calculateTextWidthStub,
  NodeViewStub: NodeViewStub,
  NodeListenerStub: createNodeListenerStub
};