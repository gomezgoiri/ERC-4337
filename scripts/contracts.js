const { Contract, Interface, JsonRpcProvider } = require("ethers")

const {
  entryPointAddress,
  simpleAccountFactoryAddress,
  verifyingPaymasterAddress,
  wethAddress
} = require("../deployData.json")

const {
  abi: saf
} = require("../artifacts/contracts/samples/SimpleAccountFactory.sol/SimpleAccountFactory.json")

const {
  abi: sa
} = require("../artifacts/contracts/samples/SimpleAccount.sol/SimpleAccount.json")

const {
  abi: ep
} = require("../artifacts/contracts/core/EntryPoint.sol/EntryPoint.json")

const {
  abi: pm
} = require("../artifacts/contracts/samples/VerifyingPaymaster.sol/VerifyingPaymaster.json")

const {
  abi: weth
} = require("../artifacts/contracts/samples/WETH9.sol/WETH9.json")

const provider = new JsonRpcProvider("http://127.0.0.1:8545")

const contracts = {
  simpleAccountFactory: {
    iface: new Interface(saf),
    contract: new Contract(simpleAccountFactoryAddress, saf, provider)
  },
  simpleAccount: {
    iface: new Interface(sa)
  },
  entryPoint: {
    iface: new Interface(ep),
    contract: new Contract(entryPointAddress, ep, provider)
  },
  paymaster: {
    contract: new Contract(verifyingPaymasterAddress, pm, provider)
  },
  weth9: {
    iface: new Interface(weth),
    contract: new Contract(wethAddress, weth, provider)
  }
}

module.exports = {
  provider,
  ...contracts
}
