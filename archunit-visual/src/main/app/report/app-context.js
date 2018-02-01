"use strict";

/*
 * Some poor man's DI solution...
 */

const init = (getVisualizationStyles, getCalculateTextWidth) => {

  const getVisualizationFunctions = () => ({
    packSiblings: require('d3').packSiblings,
    packEnclose: require('d3').packEnclose,
    calculateTextWidth: getCalculateTextWidth()
  });

  const getTreeVisualizer = () => {
    const visualizationFunctions = getVisualizationFunctions();
    const visualizationStyles = getVisualizationStyles();

    return require("./tree-visualizer").newInstance(visualizationFunctions, visualizationStyles);
  };

  const getGraphVisualizer = () => {
    return require('./graph-visualizer').newInstance(getTreeVisualizer(), require('./dependencies-visualizer'))
  };

  const getJsonToRoot = () => {
    const jsonToDependencies = require('./dependencies.js').jsonToDependencies;
    const predicates = require('./predicates');
    const nodeKinds = require('./node-kinds.json');

    return require('./tree').init(getTreeVisualizer(), jsonToDependencies, predicates, nodeKinds).jsonToRoot;
  };

  const getJsonToGraph = () => {
    return require('./graph').init(getJsonToRoot(), getGraphVisualizer()).jsonToGraph
  };

  return {
    getTreeVisualizer,
    getVisualizationFunctions,
    getVisualizationStyles,
    getJsonToRoot,
    getJsonToGraph
  }
};

module.exports.newInstance = overrides => {
  overrides = overrides || {};

  const getVisualizationStyles = () => overrides.visualizationStyles || require('./visualization-styles').fromEmbeddedStyleSheet();
  const getCalculateTextWidth = () => overrides.calculateTextWidth || require('./text-width-calculator');

  return init(getVisualizationStyles, getCalculateTextWidth);
};