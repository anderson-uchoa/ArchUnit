'use strict';

require('./chai-extensions');
const expect = require("chai").expect;
const hierarchy = require("../../../main/resources/report/lib/d3.js").hierarchy;
const pack = require("../../../main/resources/report/lib/d3.js").pack().size([500, 500]).padding(100);
const jsonToRoot = require("../../../main/resources/report/tree.js").jsonToRoot;
const jsonToDependencies = require("../../../main/resources/report/dependencies.js").jsonToDependencies;
const testJson = require("./test-json-creator");

let getNode = (root, fullname) => root.nodeMap.get(fullname);

let setupSimpleTestTree1 = () => {
  let simpleJsonTree = testJson.package("com.tngtech")
      .add(testJson.package("main")
          .add(testJson.clazz("class1", "abstractclass")
              .callingMethod("com.tngtech.interface1", "startMethod(arg1, arg2)", "targetMethod()")
              .build())
          .build())
      .add(testJson.package("test")
          .add(testJson.clazz("testclass1")
              .accessingField("com.tngtech.class2", "testclass1()", "field1")
              .build())
          .add(testJson.package("subtest")
              .add(testJson.clazz("subtestclass1", "class")
                  .implementing("com.tngtech.interface1")
                  .callingConstructor("com.tngtech.test.testclass1", "startMethod(arg)", "testclass1()")
                  .build())
              .build())
          .build())
      .add(testJson.clazz("class2", "class")
          .extending("com.tngtech.main.class1")
          .implementing("com.tngtech.interface1")
          .build())
      .add(testJson.clazz("interface1", "interface").build())
      .build();
  let root = jsonToRoot(simpleJsonTree);
  let d3root = hierarchy(root, d => d.currentChildren)
      .sum(d => d.currentChildren.length === 0 ? 10 : d.currentChildren.length)
      .sort((a, b) => b.value - a.value);
  d3root = pack(d3root);
  d3root.descendants().forEach(d => d.data.initVisual(d.x, d.y, d.r));
  let deps = jsonToDependencies(simpleJsonTree, root.nodeMap);
  root.setDepsForAll(deps);
  return root;
};

let allDeps1 = [
  "com.tngtech.main.class1->com.tngtech.interface1(startMethod(arg1, arg2) methodCall targetMethod())",
  "com.tngtech.test.testclass1->com.tngtech.class2(testclass1() fieldAccess field1)",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.interface1( implements )",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(startMethod(arg) constructorCall testclass1())",
  "com.tngtech.class2->com.tngtech.main.class1( extends )",
  "com.tngtech.class2->com.tngtech.interface1( implements )"
];

let setupSimpleTestTree2 = () => {
  let simpleJsonTree = testJson.package("com.tngtech")
      .add(testJson.package("main")
          .add(testJson.clazz("class1", "abstractclass")
              .implementing("com.tngtech.interface1")
              .callingMethod("com.tngtech.interface1", "startMethod(arg1, arg2)", "targetMethod()")
              .build())
          .build())
      .add(testJson.package("test")
          .add(testJson.clazz("testclass1")
              .accessingField("com.tngtech.class2", "testclass1()", "field1")
              .callingMethod("com.tngtech.class2", "testclass1()", "targetMethod()")
              .accessingField("com.tngtech.main.class1", "startMethod1()", "field1")
              .accessingField("com.tngtech.main.class1", "startMethod2()", "field1")
              .build())
          .add(testJson.package("subtest")
              .add(testJson.clazz("subtestclass1", "class")
                  .implementing("com.tngtech.interface1")
                  .callingMethod("com.tngtech.class2", "startMethod1()", "targetMethod()")
                  .callingConstructor("com.tngtech.test.testclass1", "doSmth(arg)", "testclass1()")
                  .callingConstructor("com.tngtech.test.testclass1", "startMethod1()", "testclass1(arg)")
                  .build())
              .build())
          .build())
      .add(testJson.clazz("class2", "class")
          .extending("com.tngtech.main.class1")
          .implementing("com.tngtech.interface1")
          .build())
      .add(testJson.clazz("interface1", "interface").build())
      .build();
  let root = jsonToRoot(simpleJsonTree);
  let d3root = hierarchy(root, d => d.currentChildren)
      .sum(d => d.currentChildren.length === 0 ? 10 : d.currentChildren.length)
      .sort((a, b) => b.value - a.value);
  d3root = pack(d3root);
  d3root.descendants().forEach(d => d.data.initVisual(d.x, d.y, d.r));
  let deps = jsonToDependencies(simpleJsonTree, root.nodeMap);
  root.setDepsForAll(deps);
  return root;
};

let allDeps2 = [
  "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
  "com.tngtech.test.testclass1->com.tngtech.class2(testclass1() several several)",
  "com.tngtech.test.testclass1->com.tngtech.main.class1(several fieldAccess field1)",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.interface1( implements )",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.class2(startMethod1() methodCall targetMethod())",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(several constructorCall several)",
  "com.tngtech.class2->com.tngtech.main.class1( extends )",
  "com.tngtech.class2->com.tngtech.interface1( implements )"
];

let testFoldedDeps = [
  "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
  "com.tngtech.test->com.tngtech.class2(several several several)",
  "com.tngtech.test->com.tngtech.main.class1(testclass1.several fieldAccess field1)",
  "com.tngtech.test->com.tngtech.interface1(subtest.subtestclass1 implements )",
  "com.tngtech.class2->com.tngtech.main.class1( extends )",
  "com.tngtech.class2->com.tngtech.interface1( implements )"
];

let mainFoldedDeps = [
  "com.tngtech.main->com.tngtech.interface1(class1.several several several)",
  "com.tngtech.test.testclass1->com.tngtech.class2(testclass1() several several)",
  "com.tngtech.test.testclass1->com.tngtech.main(several fieldAccess class1.field1)",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.interface1( implements )",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.class2(startMethod1() methodCall targetMethod())",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(several constructorCall several)",
  "com.tngtech.class2->com.tngtech.main( extends class1)",
  "com.tngtech.class2->com.tngtech.interface1( implements )"
];

let testmainFoldedDeps = [
  "com.tngtech.main->com.tngtech.interface1(class1.several several several)",
  "com.tngtech.test->com.tngtech.class2(several several several)",
  "com.tngtech.test->com.tngtech.main(testclass1.several fieldAccess class1.field1)",
  "com.tngtech.test->com.tngtech.interface1(subtest.subtestclass1 implements )",
  "com.tngtech.class2->com.tngtech.main( extends class1)",
  "com.tngtech.class2->com.tngtech.interface1( implements )"
];

describe("Dependencies", () => {
  it("are created correctly", () => {
    let root = setupSimpleTestTree1();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps1);
  });

  it("are initially uniqued correctly", () => {
    let root = setupSimpleTestTree2();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
  });

  it("calc their end positions correctly", () => {
    let root = setupSimpleTestTree2();
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });

  it("transform if origin is folded: no dependencies within the folded package, " +
      "grouping dependencies with the same target (only different properties are replaced by \"several\")", () => {
    let root = setupSimpleTestTree2();
    getNode(root, "com.tngtech.test").changeFold();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(testFoldedDeps);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });

  it("transform if target is folded: no dependencies within the folded package, " +
      "grouping dependencies with the same target (only different properties are replaced by \"several\")", () => {
    let root = setupSimpleTestTree2();
    getNode(root, "com.tngtech.main").changeFold();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(mainFoldedDeps);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });

  it("transform if origin and target are folded: no dependencies within the folded package, " +
      "grouping dependencies with the same target (only different properties are replaced by \"several\")", () => {
    let root = setupSimpleTestTree2();
    getNode(root, "com.tngtech.test").changeFold();
    getNode(root, "com.tngtech.main").changeFold();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(testmainFoldedDeps);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });

  it("does the filtering of classes only with eliminating packages correctly (no dependencies of eliminated nodes) " +
      "and resets them correctly", () => {
    let root = setupSimpleTestTree2();
    root.filterAll("subtest", true, true, false, true, false, true);
    let exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
      "com.tngtech.test.testclass1->com.tngtech.class2(testclass1() several several)",
      "com.tngtech.test.testclass1->com.tngtech.main.class1(several fieldAccess field1)",
      "com.tngtech.class2->com.tngtech.main.class1( extends )",
      "com.tngtech.class2->com.tngtech.interface1( implements )"
    ];
    expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    root.resetFilter();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });

  it("does the filtering of packages only correctly (no dependencies of eliminated nodes) and resets them correctly",
      () => {
        let root = setupSimpleTestTree2();
        root.filterAll("main", false, false, true, false, true, false);
        let exp = [
          "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
          "com.tngtech.class2->com.tngtech.main.class1( extends )",
          "com.tngtech.class2->com.tngtech.interface1( implements )"
        ];
        expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
        expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
        root.resetFilter();
        expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
        expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
      });

  it("does the filtering of packages and classes correctly (no dependencies of eliminated nodes) and resets them correctly",
      () => {
        let root = setupSimpleTestTree2();
        root.filterAll("i", false, false, true, true, false, false);
        let exp = [
          "com.tngtech.test.testclass1->com.tngtech.class2(testclass1() several several)",
          "com.tngtech.test.subtest.subtestclass1->com.tngtech.class2(startMethod1() methodCall targetMethod())",
          "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(several constructorCall several)"
        ];
        let desc = root.getVisibleDescendants();
        let act = root.getVisibleEdges();
        expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
        expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
        root.resetFilter();
        expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
        expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
      });

  it("does the filtering of classes only correctly (no dependencies of eliminated nodes) and resets them correctly",
      () => {
        let root = setupSimpleTestTree2();
        root.filterAll("i", false, false, false, true, false, false);
        let exp = [
          "com.tngtech.test.testclass1->com.tngtech.class2(testclass1() several several)",
          "com.tngtech.test.testclass1->com.tngtech.main.class1(several fieldAccess field1)",
          "com.tngtech.test.subtest.subtestclass1->com.tngtech.class2(startMethod1() methodCall targetMethod())",
          "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(several constructorCall several)",
          "com.tngtech.class2->com.tngtech.main.class1( extends )"
        ];
        let desc = root.getVisibleDescendants();
        let act = root.getVisibleEdges();
        expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
        expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
        root.resetFilter();
        expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
        expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
      });

  it("does the following correctly (in this order): fold, filter, reset filter and unfold", () => {
    let root = setupSimpleTestTree2();
    getNode(root, "com.tngtech.test").changeFold();
    root.filterAll("subtest", true, true, false, true, false, true);
    let exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
      "com.tngtech.test->com.tngtech.class2(testclass1.testclass1() several several)",
      "com.tngtech.test->com.tngtech.main.class1(testclass1.several fieldAccess field1)",
      "com.tngtech.class2->com.tngtech.main.class1( extends )",
      "com.tngtech.class2->com.tngtech.interface1( implements )"
    ];
    expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    root.resetFilter();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(testFoldedDeps);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    getNode(root, "com.tngtech.test").changeFold();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });

  it("does the following correctly (in this order): fold, filter, unfold and reset filter", () => {
    let root = setupSimpleTestTree2();
    getNode(root, "com.tngtech.test").changeFold();
    root.filterAll("subtest", true, true, false, true, false, true);
    let exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
      "com.tngtech.test->com.tngtech.class2(testclass1.testclass1() several several)",
      "com.tngtech.test->com.tngtech.main.class1(testclass1.several fieldAccess field1)",
      "com.tngtech.class2->com.tngtech.main.class1( extends )",
      "com.tngtech.class2->com.tngtech.interface1( implements )"
    ];
    expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    getNode(root, "com.tngtech.test").changeFold();
    exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
      "com.tngtech.test.testclass1->com.tngtech.class2(testclass1() several several)",
      "com.tngtech.test.testclass1->com.tngtech.main.class1(several fieldAccess field1)",
      "com.tngtech.class2->com.tngtech.main.class1( extends )",
      "com.tngtech.class2->com.tngtech.interface1( implements )"
    ];
    expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    root.resetFilter();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });

  it("does the following correctly (in this order): filter, fold, unfold and reset the filter", () => {
    let root = setupSimpleTestTree2();
    root.filterAll("subtest", true, true, false, true, false, true);
    getNode(root, "com.tngtech.test").changeFold();
    let exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
      "com.tngtech.test->com.tngtech.class2(testclass1.testclass1() several several)",
      "com.tngtech.test->com.tngtech.main.class1(testclass1.several fieldAccess field1)",
      "com.tngtech.class2->com.tngtech.main.class1( extends )",
      "com.tngtech.class2->com.tngtech.interface1( implements )"
    ];
    expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    getNode(root, "com.tngtech.test").changeFold();
    exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
      "com.tngtech.test.testclass1->com.tngtech.class2(testclass1() several several)",
      "com.tngtech.test.testclass1->com.tngtech.main.class1(several fieldAccess field1)",
      "com.tngtech.class2->com.tngtech.main.class1( extends )",
      "com.tngtech.class2->com.tngtech.interface1( implements )"
    ];
    expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    root.resetFilter();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });

  it("does the following correctly (in this order): filter, fold, reset the filter and unfold", () => {
    let root = setupSimpleTestTree2();
    root.filterAll("subtest", true, true, false, true, false, true);
    getNode(root, "com.tngtech.test").changeFold();
    let exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(several several several)",
      "com.tngtech.test->com.tngtech.class2(testclass1.testclass1() several several)",
      "com.tngtech.test->com.tngtech.main.class1(testclass1.several fieldAccess field1)",
      "com.tngtech.class2->com.tngtech.main.class1( extends )",
      "com.tngtech.class2->com.tngtech.interface1( implements )"
    ];
    expect(root.getVisibleEdges()).to.containExactlyDependencies(exp);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    root.resetFilter();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(testFoldedDeps);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    getNode(root, "com.tngtech.test").changeFold();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });

  it("transform reverse on unfold", () => {
    let root = setupSimpleTestTree2();
    getNode(root, "com.tngtech.test").changeFold();
    getNode(root, "com.tngtech.main").changeFold();
    getNode(root, "com.tngtech.test").changeFold();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(mainFoldedDeps);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
    getNode(root, "com.tngtech.main").changeFold();
    expect(root.getVisibleEdges()).to.containExactlyDependencies(allDeps2);
    expect(root.getVisibleEdges()).to.haveCorrectEndPositions();
  });
});