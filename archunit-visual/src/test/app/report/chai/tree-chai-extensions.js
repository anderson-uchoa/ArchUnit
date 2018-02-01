'use strict';

require('chai').use(function (chai, utils) {
  const Assertion = chai.Assertion;

  const nodesFrom = object => Array.from(object.root ? object.root.getSelfAndDescendants() : object);

  const convertActualAndExpectedToStrings = (actual, args) => {
    const expectedNodeFullNames = Array.isArray(args[0]) ? args[0] : Array.from(args);

    const actualStrings = actual.map(n => n.getFullName()).sort();
    const expectedStrings = expectedNodeFullNames.sort();
    return {actualStrings, expectedStrings};
  };

  Assertion.addMethod('containOnlyNodes', function () {
    const {actualStrings, expectedStrings} = convertActualAndExpectedToStrings(nodesFrom(this._obj), arguments);

    new Assertion(actualStrings).to.deep.equal(expectedStrings);
  });

  Assertion.addMethod('containNodes', function () {
    const {actualStrings, expectedStrings} = convertActualAndExpectedToStrings(nodesFrom(this._obj), arguments);

    new Assertion(actualStrings).to.include.members(expectedStrings);
  });

  Assertion.addMethod('root', function () {
    const node = this._obj;
    const negateIfNecessary = chain => utils.flag(this, 'negate') ? chain.not : chain;

    negateIfNecessary(new Assertion(node.isRoot())).to.be.true;
  });
});