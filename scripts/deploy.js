const fs = require("fs")
const { ethers } = require("hardhat")

const testData = require("../testData.json")

async function main() {
  const entryPoint = await ethers.deployContract("EntryPoint")
  const entryPointAddress = await entryPoint.getAddress()

  const simpleAccountFactory = await ethers.deployContract(
    "SimpleAccountFactory",
    [entryPointAddress]
  )

  const verifyingPaymaster = await ethers.deployContract("VerifyingPaymaster", [
    entryPointAddress,
    testData.alicePublicKey
  ])
  const depositPaymaster = await ethers.deployContract("DepositPaymaster", [
    entryPointAddress
  ])

  const weth = await ethers.deployContract("WETH9")

  const json = JSON.stringify(
    {
      entryPointAddress,
      simpleAccountFactoryAddress: await simpleAccountFactory.getAddress(),
      verifyingPaymasterAddress: await verifyingPaymaster.getAddress(),
      depositPaymasterAddress: await depositPaymaster.getAddress(),
      wethAddress: await weth.getAddress()
    },
    null,
    "\t"
  )

  fs.writeFileSync("deployData.json", json)
  console.log(`Deployment done! Check ./deployData.json.`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
