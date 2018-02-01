'use strict';

require('./chai/dependencies-chai-extension');
const expect = require('chai').expect;

const testObjects = require("./test-object-creator.js");

const depsOfTree2WithTestFolded = [
  "com.tngtech.main.class1->com.tngtech.interface1(implements methodCall)",
  "com.tngtech.test->com.tngtech.class2()",
  "com.tngtech.test->com.tngtech.main.class1()",
  "com.tngtech.test->com.tngtech.interface1()",
  "com.tngtech.class2->com.tngtech.main.class1(extends)",
  "com.tngtech.class2->com.tngtech.interface1(implements)"
];

const depsOfTree2WithMainFolded = [
  "com.tngtech.main->com.tngtech.interface1()",
  "com.tngtech.test.testclass1->com.tngtech.class2(several)",
  "com.tngtech.test.testclass1->com.tngtech.main()",
  "com.tngtech.test.testclass1->com.tngtech.interface1(implementsAnonymous)",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.interface1(implements)",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.class2(methodCall)",
  "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(constructorCall)",
  "com.tngtech.class2->com.tngtech.main()",
  "com.tngtech.class2->com.tngtech.interface1(implements)"
];

const initDependency = require('./main-files').get('dependency').init;

const stubs = require('./stubs');

const testJson = require('./test-json-creator');
const appContext = require('./main-files').get('app-context').newInstance({
  visualizationStyles: stubs.visualizationStylesStub(30),
  calculateTextWidth: stubs.calculateTextWidthStub,
  NodeView: stubs.NodeViewStub, //FIXME: really necessary??
  DependencyView: stubs.DependencyViewStub
});
const Node = appContext.getNode();
const Dependencies = appContext.getDependencies();

/*
 * json-root with every kind of dependency of both groups (inheritance and access),
 * several different dependencies from one class to another one,
 * dependencies between a class and its inner class
 * and mutual dependencies (between separated classes and a class and its inner class)
 */
const jsonRoot = testJson.package('com.tngtech')
  .add(testJson.package('pkg1')
    .add(testJson.clazz('SomeClass1', 'class')
      .callingMethod('com.tngtech.pkg1.SomeClass2', 'startMethod(arg1, arg2)', 'targetMethod()')
      .accessingField('com.tngtech.pkg1.SomeClass2', 'startMethod(arg1, arg2)', 'targetField')
      .implementing('com.tngtech.pkg2.SomeInterface1')
      .build())
    .add(testJson.clazz('SomeClass2', 'class')
      .accessingField('com.tngtech.pkg1.SomeClass1', 'startMethod(arg)', 'targetField')
      .build())
    .build())
  .add(testJson.package('pkg2')
    .add(testJson.clazz('SomeInterface1', 'interface').build())
    .add(testJson.package('subpkg1')
      .add(testJson.clazz('SomeClass1', 'class')
        .extending('com.tngtech.pkg1.SomeClass1')
        .callingConstructor('com.tngtech.pkg1.SomeClass1', '<init>()', '<init>()')
        .build())
      .add(testJson.clazz('SomeClassWithInnerInterface', 'class')
        .havingInnerClass(testJson.clazz('SomeInnerInterface', 'interface')
          .callingMethod('com.tngtech.pkg2.subpkg1.SomeClassWithInnerInterface', 'startMethod(arg)', 'targetMethod(arg1, arg2)')
          .build())
        .implementingAnonymous('com.tngtech.pkg2.subpkg1.SomeClassWithInnerInterface$SomeInnerInterface')
        .build())
      .build())
    .build())
  .add(testJson.clazz('SomeClassWithInnerClass', 'class')
    .implementingAnonymous('com.tngtech.pkg2.SomeInterface1')
    .havingInnerClass(testJson.clazz('SomeInnerClass', 'class')
      .accessingField('com.tngtech.SomeClassWithInnerClass', 'startMethod()', 'targetField')
      .build())
    .build())
  .build();
const root = new Node(jsonRoot);

describe('Dependencies', () => {
  it('creates correct elementary dependencies from json-input', () => {
    const dependencies = new Dependencies(jsonRoot, root);
    const exp = [
      'com.tngtech.pkg1.SomeClass1->com.tngtech.pkg1.SomeClass2(startMethod(arg1, arg2) methodCall targetMethod())',
      'com.tngtech.pkg1.SomeClass1->com.tngtech.pkg1.SomeClass2(startMethod(arg1, arg2) fieldAccess targetField)',
      'com.tngtech.pkg1.SomeClass1->com.tngtech.pkg2.SomeInterface1(implements)',
      'com.tngtech.pkg1.SomeClass2->com.tngtech.pkg1.SomeClass1(startMethod(arg) fieldAccess targetField)',
      'com.tngtech.pkg2.subpkg1.SomeClass1->com.tngtech.pkg1.SomeClass1(extends)',
      'com.tngtech.pkg2.subpkg1.SomeClass1->com.tngtech.pkg1.SomeClass1(<init>() constructorCall <init>())',
      'com.tngtech.pkg2.subpkg1.SomeClassWithInnerInterface$SomeInnerInterface->com.tngtech.pkg2.subpkg1.SomeClassWithInnerInterface(startMethod(arg) methodCall targetMethod(arg1, arg2))',
      'com.tngtech.pkg2.subpkg1.SomeClassWithInnerInterface->com.tngtech.pkg2.subpkg1.SomeClassWithInnerInterface$SomeInnerInterface(implementsAnonymous)',
      'com.tngtech.SomeClassWithInnerClass->com.tngtech.pkg2.SomeInterface1(implementsAnonymous)',
      'com.tngtech.SomeClassWithInnerClass$SomeInnerClass->com.tngtech.SomeClassWithInnerClass(startMethod() fieldAccess targetField)'
    ];
    expect(dependencies._elementary).to.haveDependencyStrings(exp);
  });

  it("are created correctly", () => {
    const graphWrapper = testObjects.testGraph1();
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
  });

  it("are initially uniqued correctly", () => {
    const graphWrapper = testObjects.testGraph2();
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
  });

  it("know if they must share their at least one of their end nodes", () => {
    const graphWrapper = testObjects.testGraphWithOverlappingNodesAndMutualDependencies();
    const hasEndNodes = (from, to) => d => (d.from === from || d.to === from) && (d.from === to || d.to === to);
    const filter = d => hasEndNodes("com.tngtech.test.subtest.subtestclass1", "com.tngtech.interface1")(d)
    || hasEndNodes("com.tngtech.class2", "com.tngtech.class2$InnerClass2")(d);
    graphWrapper.graph.dependencies.getVisible().filter(filter).forEach(d => expect(d.visualData.mustShareNodes).to.equal(true));
    graphWrapper.graph.dependencies.getVisible().filter(d => !filter(d)).forEach(d => expect(d.visualData.mustShareNodes).to.equal(false));
  });

  it("transform if origin is folded and origin is a package", () => {
    const graphWrapper = testObjects.testGraph2();
    const node = graphWrapper.getNode("com.tngtech.test");
    node._changeFoldIfInnerNodeAndRelayout();
    return graphWrapper.graph.root.doNext(() => expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(depsOfTree2WithTestFolded));
  });

  it("transform if target is folded and target is a package", () => {
    const graphWrapper = testObjects.testGraph2();
    const node = graphWrapper.getNode("com.tngtech.main");
    node._changeFoldIfInnerNodeAndRelayout();
    return graphWrapper.graph.root.doNext(() => expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(depsOfTree2WithMainFolded));
  });

  it("transform if origin and target are folded and both are packages", () => {
    const graphWrapper = testObjects.testGraph2();

    const node1 = graphWrapper.getNode("com.tngtech.test");
    node1._changeFoldIfInnerNodeAndRelayout();
    const node2 = graphWrapper.getNode("com.tngtech.main");
    node2._changeFoldIfInnerNodeAndRelayout();

    const exp = [
      "com.tngtech.main->com.tngtech.interface1()",
      "com.tngtech.test->com.tngtech.class2()",
      "com.tngtech.test->com.tngtech.main()",
      "com.tngtech.test->com.tngtech.interface1()",
      "com.tngtech.class2->com.tngtech.main()",
      "com.tngtech.class2->com.tngtech.interface1(implements)"
    ];

    return graphWrapper.graph.root.doNext(() => expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp));
  });

  it("transform if class with inner class is folded", () => {
    const graphWrapper = testObjects.testGraphWithOverlappingNodesAndMutualDependencies();

    const node = graphWrapper.getNode("com.tngtech.test.testclass1");
    node._changeFoldIfInnerNodeAndRelayout();

    const exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(methodCall)",
      "com.tngtech.main.class1->com.tngtech.test.testclass1(childrenAccess)",
      "com.tngtech.test.testclass1->com.tngtech.class2(several)",
      "com.tngtech.test.subtest.subtestclass1->com.tngtech.interface1(implements)",
      "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(constructorCall)",
      "com.tngtech.class2->com.tngtech.main.class1(extends)",
      "com.tngtech.class2->com.tngtech.interface1(implements)",
      "com.tngtech.class2$InnerClass2->com.tngtech.class2(fieldAccess)",
      "com.tngtech.class2->com.tngtech.class2$InnerClass2(fieldAccess)",
      "com.tngtech.interface1->com.tngtech.test.subtest.subtestclass1(methodCall)"
    ];

    return graphWrapper.graph.root.doNext(() => expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp));
  });

  it("transform reverse on unfold of a single package", () => {
    const graphWrapper = testObjects.testGraph2();

    const node = graphWrapper.getNode("com.tngtech.main");
    node._changeFoldIfInnerNodeAndRelayout();
    node._changeFoldIfInnerNodeAndRelayout();

    return graphWrapper.graph.root.doNext(() => {
      expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
    });
  });

  it("transform reverse on unfold of several packages", () => {
    const graphWrapper = testObjects.testGraph2();

    const node1 = graphWrapper.getNode("com.tngtech.test");
    node1._changeFoldIfInnerNodeAndRelayout();
    const node2 = graphWrapper.getNode("com.tngtech.main");
    node2._changeFoldIfInnerNodeAndRelayout();
    const node3 = graphWrapper.getNode("com.tngtech.test");
    node3._changeFoldIfInnerNodeAndRelayout();
    const node4 = graphWrapper.getNode("com.tngtech.main");
    node4._changeFoldIfInnerNodeAndRelayout();

    return graphWrapper.graph.root.doNext(() => expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies));
  });

  it("transform reverse on unfold of a single package, when another package is folded", () => {
    const graphWrapper = testObjects.testGraph2();

    const node1 = graphWrapper.getNode("com.tngtech.test");
    node1._changeFoldIfInnerNodeAndRelayout();
    const node2 = graphWrapper.getNode("com.tngtech.main");
    node2._changeFoldIfInnerNodeAndRelayout();
    const node3 = graphWrapper.getNode("com.tngtech.test");
    node3._changeFoldIfInnerNodeAndRelayout();

    return graphWrapper.graph.root.doNext(() => expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(depsOfTree2WithMainFolded));
  });

  it("are uniqued and grouped correctly with complicated dependency structure", () => {
    const graphWrapper = testObjects.testGraph3();
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);

    const node1 = graphWrapper.getNode("com.tngtech.test");
    node1._changeFoldIfInnerNodeAndRelayout();
    let exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(implements methodCall)",
      "com.tngtech.main.class3->com.tngtech.interface1(implements methodCall)",
      "com.tngtech.test->com.tngtech.class2()",
      "com.tngtech.test->com.tngtech.main.class1()",
      "com.tngtech.test->com.tngtech.interface1()",
      "com.tngtech.class2->com.tngtech.main.class1(extends)",
      "com.tngtech.class2->com.tngtech.interface1(implements)"
    ];
    return graphWrapper.graph.root.doNext(() => {
      expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);

      const node2 = graphWrapper.getNode("com.tngtech.test");
      node2._changeFoldIfInnerNodeAndRelayout();
      const node3 = graphWrapper.getNode("com.tngtech.main");
      node3._changeFoldIfInnerNodeAndRelayout();

      return graphWrapper.graph.root.doNext(() => {
        exp = [
          "com.tngtech.main->com.tngtech.interface1()",
          "com.tngtech.test.testclass1->com.tngtech.class2(extends several)",
          "com.tngtech.test.testclass1->com.tngtech.main()",
          "com.tngtech.test.testclass1->com.tngtech.interface1(implementsAnonymous)",
          "com.tngtech.test.subtest.subtestclass1->com.tngtech.interface1(implements)",
          "com.tngtech.test.subtest.subtestclass1->com.tngtech.class2(methodCall)",
          "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(constructorCall)",
          "com.tngtech.class2->com.tngtech.main()",
          "com.tngtech.class2->com.tngtech.interface1(implements)"
        ];
        expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);
      });
    });
  });

  it("does the filtering of classes (no dependencies of eliminated nodes) and resets them correctly", () => {
    const graphWrapper = testObjects.testGraph2();

    graphWrapper.graph.filterNodesByNameNotContaining("subtest");
    const exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(implements methodCall)",
      "com.tngtech.test.testclass1->com.tngtech.class2(several)",
      "com.tngtech.test.testclass1->com.tngtech.main.class1(fieldAccess)",
      "com.tngtech.test.testclass1->com.tngtech.interface1(implementsAnonymous)",
      "com.tngtech.class2->com.tngtech.main.class1(extends)",
      "com.tngtech.class2->com.tngtech.interface1(implements)"
    ];
    return graphWrapper.graph.dependencies.doNext(() => expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp))
      .then(() => {
        graphWrapper.graph.filterNodesByNameContaining("");
        return graphWrapper.graph.dependencies.doNext(() => expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies));
      });
  });

  it("does the following correctly (in this order): fold, filter, reset filter and unfold", () => {
    const graphWrapper = testObjects.testGraph2();

    const node = graphWrapper.getNode("com.tngtech.test");
    node._changeFoldIfInnerNodeAndRelayout();
    return graphWrapper.graph.root.doNext(() => {
      graphWrapper.graph.filterNodesByNameNotContaining("subtest");
      const exp = [
        "com.tngtech.main.class1->com.tngtech.interface1(implements methodCall)",
        "com.tngtech.test->com.tngtech.class2()",
        "com.tngtech.test->com.tngtech.main.class1()",
        "com.tngtech.test->com.tngtech.interface1()",
        "com.tngtech.class2->com.tngtech.main.class1(extends)",
        "com.tngtech.class2->com.tngtech.interface1(implements)"
      ];
      expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);

      graphWrapper.graph.filterNodesByNameContaining("");
      expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(depsOfTree2WithTestFolded);
      node._changeFoldIfInnerNodeAndRelayout();
      return graphWrapper.graph.root.doNext(() => {
        expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
      });
    });
  });

  it("does the following correctly (in this order): fold, filter, unfold and reset filter", () => {
    const graphWrapper = testObjects.testGraph2();

    const node = graphWrapper.getNode("com.tngtech.test");
    node._changeFoldIfInnerNodeAndRelayout();

    return graphWrapper.graph.root.doNext(() => {
      graphWrapper.graph.filterNodesByNameNotContaining("subtest");
      let exp = [
        "com.tngtech.main.class1->com.tngtech.interface1(implements methodCall)",
        "com.tngtech.test->com.tngtech.class2()",
        "com.tngtech.test->com.tngtech.main.class1()",
        "com.tngtech.test->com.tngtech.interface1()",
        "com.tngtech.class2->com.tngtech.main.class1(extends)",
        "com.tngtech.class2->com.tngtech.interface1(implements)"
      ];
      expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp)
      node._changeFoldIfInnerNodeAndRelayout();
      exp = [
        "com.tngtech.main.class1->com.tngtech.interface1(implements methodCall)",
        "com.tngtech.test.testclass1->com.tngtech.class2(several)",
        "com.tngtech.test.testclass1->com.tngtech.main.class1(fieldAccess)",
        "com.tngtech.test.testclass1->com.tngtech.interface1(implementsAnonymous)",
        "com.tngtech.class2->com.tngtech.main.class1(extends)",
        "com.tngtech.class2->com.tngtech.interface1(implements)"
      ];

      return graphWrapper.graph.root.doNext(() => {
        expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);
        graphWrapper.graph.filterNodesByNameContaining("");
        expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
      });
    });
  });

  it("does the following correctly (in this order): filter, fold, unfold and reset the filter", () => {
    const graphWrapper = testObjects.testGraph2();

    graphWrapper.graph.filterNodesByNameNotContaining("subtest");
    const node = graphWrapper.getNode("com.tngtech.test");
    node._changeFoldIfInnerNodeAndRelayout();
    return graphWrapper.graph.root.doNext(() => {
      let exp = [
        "com.tngtech.main.class1->com.tngtech.interface1(implements methodCall)",
        "com.tngtech.test->com.tngtech.class2()",
        "com.tngtech.test->com.tngtech.main.class1()",
        "com.tngtech.test->com.tngtech.interface1()",
        "com.tngtech.class2->com.tngtech.main.class1(extends)",
        "com.tngtech.class2->com.tngtech.interface1(implements)"
      ];
      expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);

      node._changeFoldIfInnerNodeAndRelayout();

      return graphWrapper.graph.root.doNext(() => {
        exp = [
          "com.tngtech.main.class1->com.tngtech.interface1(implements methodCall)",
          "com.tngtech.test.testclass1->com.tngtech.class2(several)",
          "com.tngtech.test.testclass1->com.tngtech.main.class1(fieldAccess)",
          "com.tngtech.test.testclass1->com.tngtech.interface1(implementsAnonymous)",
          "com.tngtech.class2->com.tngtech.main.class1(extends)",
          "com.tngtech.class2->com.tngtech.interface1(implements)"
        ];
        expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);

        graphWrapper.graph.filterNodesByNameContaining("");
        expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
      });
    });

  });

  it("does the following correctly (in this order): filter, fold, reset the filter and unfold", () => {
    const graphWrapper = testObjects.testGraph2();

    graphWrapper.graph.filterNodesByNameNotContaining("subtest");
    const node = graphWrapper.getNode("com.tngtech.test");
    node._changeFoldIfInnerNodeAndRelayout();
    return graphWrapper.graph.root.doNext(() => {
      const exp = [
        "com.tngtech.main.class1->com.tngtech.interface1(implements methodCall)",
        "com.tngtech.test->com.tngtech.class2()",
        "com.tngtech.test->com.tngtech.main.class1()",
        "com.tngtech.test->com.tngtech.interface1()",
        "com.tngtech.class2->com.tngtech.main.class1(extends)",
        "com.tngtech.class2->com.tngtech.interface1(implements)"
      ];
      expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);

      graphWrapper.graph.filterNodesByNameContaining("");
      expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(depsOfTree2WithTestFolded);

      node._changeFoldIfInnerNodeAndRelayout();
      return graphWrapper.graph.root.doNext(() => expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies));
    });
  });

  it("does the filtering by type (hiding interfaces) correctly (no dependencies of eliminated nodes) " +
    "and resets them correctly", () => {
    const graphWrapper = testObjects.testGraph2();

    graphWrapper.graph.filterNodesByType({showInterfaces: false, showClasses: true});
    const exp = [
      "com.tngtech.test.testclass1->com.tngtech.class2(several)",
      "com.tngtech.test.testclass1->com.tngtech.main.class1(fieldAccess)",
      "com.tngtech.test.subtest.subtestclass1->com.tngtech.class2(methodCall)",
      "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(constructorCall)",
      "com.tngtech.class2->com.tngtech.main.class1(extends)"
    ];
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);
    graphWrapper.graph.filterNodesByType({showInterfaces: true, showClasses: true});
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
  });

  it("does the filtering by type (hiding classes) with eliminating packages correctly " +
    "(no dependencies of eliminated nodes) and resets them correctly", () => {
    const graphWrapper = testObjects.testGraph2();

    graphWrapper.graph.filterNodesByType({showInterfaces: true, showClasses: false});
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies([])
    graphWrapper.graph.filterNodesByType({showInterfaces: true, showClasses: true});
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
  })
  ;

  it("does the filtering by type (only show inheritance) correctly and resets it", () => {
    const graphWrapper = testObjects.testGraph2();

    graphWrapper.graph.filterDependenciesByType({
      showImplementing: true,
      showExtending: true,
      showConstructorCall: false,
      showMethodCall: false,
      showFieldAccess: false,
      showAnonymousImplementation: false,
      showDepsBetweenChildAndParent: true
    });
    const exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(implements)",
      "com.tngtech.test.subtest.subtestclass1->com.tngtech.interface1(implements)",
      "com.tngtech.class2->com.tngtech.main.class1(extends)",
      "com.tngtech.class2->com.tngtech.interface1(implements)"
    ];

    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);
    graphWrapper.graph.filterDependenciesByType({
      showImplementing: true,
      showExtending: true,
      showConstructorCall: true,
      showMethodCall: true,
      showFieldAccess: true,
      showAnonymousImplementation: true,
      showDepsBetweenChildAndParent: true
    });
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
  });

  it("does the filtering by type (do not show inheritance) correcty and resets it", () => {
    const graphWrapper = testObjects.testGraph3();
    graphWrapper.graph.filterDependenciesByType({
      showImplementing: false,
      showExtending: false,
      showConstructorCall: true,
      showMethodCall: true,
      showFieldAccess: true,
      showAnonymousImplementation: true,
      showDependenciesBetweenClassAndItsInnerClasses: true
    });
    const exp = [
      "com.tngtech.main.class1->com.tngtech.interface1(methodCall)",
      "com.tngtech.main.class3->com.tngtech.interface1(methodCall)",
      "com.tngtech.test.testclass1->com.tngtech.class2(several)",
      "com.tngtech.test.testclass1->com.tngtech.main.class1(fieldAccess)",
      "com.tngtech.test.testclass1->com.tngtech.interface1(implementsAnonymous)",
      "com.tngtech.test.subtest.subtestclass1->com.tngtech.class2(methodCall)",
      "com.tngtech.test.subtest.subtestclass1->com.tngtech.test.testclass1(constructorCall)"
    ];
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(exp);
    graphWrapper.graph.filterDependenciesByType({
      showImplementing: true,
      showExtending: true,
      showConstructorCall: true,
      showMethodCall: true,
      showFieldAccess: true,
      showAnonymousImplementation: true,
      showDependenciesBetweenClassAndItsInnerClasses: true
    });
    expect(graphWrapper.graph.dependencies.getVisible()).to.containExactlyDependencies(graphWrapper.allDependencies);
  });

  it("lists correctly the detailed dependencies of class", () => {
    const graphWrapper = testObjects.testGraph2();

    const exp = [
      "testclass1()->field1",
      "testclass1()->targetMethod()"
    ];
    const act = graphWrapper.graph.dependencies.getDetailedDependenciesOf("com.tngtech.test.testclass1", "com.tngtech.class2")
      .map(d => d.description);
    expect(act).to.containExactlyDependencies(exp);
  });

  it("lists correctly the detailed dependencies of class with inner classes depending on the fold-state of the class", () => {
    const graphWrapper = testObjects.testGraphWithOverlappingNodesAndMutualDependencies();

    let act = graphWrapper.graph.dependencies.getDetailedDependenciesOf("com.tngtech.test.testclass1", "com.tngtech.class2")
      .map(d => d.description);
    let exp = [
      "testclass1()->field1"
    ];
    expect(act).to.containExactlyDependencies(exp);

    graphWrapper.getNode("com.tngtech.test.testclass1")._changeFoldIfInnerNodeAndRelayout();
    return graphWrapper.graph.root.doNext(() => {
      act = graphWrapper.graph.dependencies.getDetailedDependenciesOf("com.tngtech.test.testclass1", "com.tngtech.class2")
        .map(d => d.description);
      exp = [
        "testclass1()->field1",
        "InnerTestClass1.innertestclass1()->field1"
      ];
      expect(act).to.containExactlyDependencies(exp);
    });
  });

  it("lists correctly the detailed dependencies of folded package", () => {
    const graphWrapper = testObjects.testGraph2();

    graphWrapper.getNode("com.tngtech.test")._changeFoldIfInnerNodeAndRelayout();

    const exp = [
      "testclass1.testclass1()->field1",
      "testclass1.testclass1()->targetMethod()",
      "subtest.subtestclass1.startMethod1()->targetMethod()",
    ];
    const act = graphWrapper.graph.dependencies.getDetailedDependenciesOf("com.tngtech.test", "com.tngtech.class2").map(d => d.description);
    expect(act).to.containExactlyDependencies(exp);
  });
});