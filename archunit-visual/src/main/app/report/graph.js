'use strict';

const d3 = require('d3');

const init = (Node, Dependencies, View, visualizationStyles) => {

  const Graph = class {
    constructor(jsonRoot, svg) {
      this._view = new View(svg);
      this.root = new Node(jsonRoot, this._view.svgElementForNodes, rootRadius => this._view.renderWithTransition(rootRadius));
      this.dependencies = new Dependencies(jsonRoot, this.root, this._view.svgElementForDependencies);
      this.root.addListener(this.dependencies.createListener());
      this.root.getLinks = () => this.dependencies.getAllLinks();
      this.root.relayout();
      //this.startSimulation = () => this.root.doNext(() => this._startSimulation());
      //this.root._callOnSelfThenEveryDescendant(node => node.callbackOnFold = () => this.startSimulation());
    }

    foldAllNodes() {
      this.root.callOnEveryDescendantThenSelf(node => node.foldIfInnerNode());
      this.root.relayout();
    }

    filterNodesByNameContaining(filterString) {
      this.root.filterByName(filterString, false);
      this.dependencies.setNodeFilters(this.root.getFilters());
      this.root.relayout();
    }

    filterNodesByNameNotContaining(filterString) {
      this.root.filterByName(filterString, true);
      this.dependencies.setNodeFilters(this.root.getFilters());
      this.root.relayout();
    }

    filterNodesByType(filter) {
      this.root.filterByType(filter.showInterfaces, filter.showClasses);
      this.dependencies.setNodeFilters(this.root.getFilters());
      this.root.relayout();
    }

    filterDependenciesByType(typeFilterConfig) {
      this.dependencies.filterByType(typeFilterConfig);
    }

    refresh() {
      this.root.relayout();
    }
  };

  return {
    Graph
  };
};

module.exports.init = init; // FIXME: Make create() the only public API

module.exports.create = () => {

  return new Promise((resolve, reject) => {
    const d3 = require('d3');

    d3.json('80/classes.json', function (error, jsonroot) {
      if (error) {
        return reject(error);
      }

      const appContext = require('./app-context').newInstance();
      const visualizationStyles = appContext.getVisualizationStyles();
      const Node = appContext.getNode(); // FIXME: Correct dependency tree
      const Dependencies = appContext.getDependencies(); // FIXME: Correct dependency tree
      const graphView = appContext.getGraphView();

      const Graph = init(Node, Dependencies, graphView, visualizationStyles).Graph;
      const graph = new Graph(jsonroot, d3.select('#visualization').node());
      graph.foldAllNodes();

      //d3.timeout(() => graph.startSimulation());

      //FIXME AU-24: Move this into graph
      graph.attachToMenu = menu => {
        menu.initializeSettings(
          {
            initialCircleFontSize: visualizationStyles.getNodeFontSize(),
            initialCirclePadding: visualizationStyles.getCirclePadding()
          })
          .onSettingsChanged(
            (circleFontSize, circlePadding) => {
              visualizationStyles.setNodeFontSize(circleFontSize);
              visualizationStyles.setCirclePadding(circlePadding);
              graph.refresh();
            })
          .onNodeTypeFilterChanged(
            filter => {
              graph.filterNodesByType(filter);
            })
          .onDependencyFilterChanged(
            filter => {
              graph.filterDependenciesByType(filter);
            })
          .onNodeNameFilterChanged((filterString, exclude) => {
            if (exclude) {
              graph.filterNodesByNameNotContaining(filterString);
            } else {
              graph.filterNodesByNameContaining(filterString);
            }
          })
          .initializeLegend([
            visualizationStyles.getLineStyle("constructorCall", "constructor call"),
            visualizationStyles.getLineStyle("methodCall", "method call"),
            visualizationStyles.getLineStyle("fieldAccess", "field access"),
            visualizationStyles.getLineStyle("extends", "extends"),
            visualizationStyles.getLineStyle("implements", "implements"),
            visualizationStyles.getLineStyle("implementsAnonymous", "implements anonymous"),
            visualizationStyles.getLineStyle("childrenAccess", "innerclass access"),
            visualizationStyles.getLineStyle("several", "grouped access")
          ]);
      };

      resolve(graph);
    });
  });
};