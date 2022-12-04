var GovToken = artifacts.require('./GovToken.sol');
var Exchange = artifacts.require('./Exchange.sol');

module.exports = async (deployer) => {
  await deployer.deploy(GovToken);
  await deployer.deploy(Exchange, GovToken.address, 100000000000000);
};
