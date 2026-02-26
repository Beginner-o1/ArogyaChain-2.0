const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DecentralizedEHRModule", (m) => {
  const ehr = m.contract("DecentralizedEHR");

  return { ehr };
});
