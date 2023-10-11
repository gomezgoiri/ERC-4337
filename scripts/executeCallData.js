const {
  initAddresses,
  isAlreadyDeployed,
  composeWETHTransferCallData,
  executeHandleOps,
  getBalances
} = require("./lib")

async function init() {
  const {
    walletAddress,
    alicePrivateKey,
    coordinatorPublicKey,
    coordinatorPrivateKey,
    bobPublicKey
  } = await initAddresses()

  await getBalances(walletAddress)

  if (!(await isAlreadyDeployed(walletAddress))) {
    console.error("Wallet needs to be constructed first.")
    return
  }

  console.log("Sending WETH from Alice contract wallet to Bob")
  const callData = await composeWETHTransferCallData(bobPublicKey, "0.01")

  const tx = await executeHandleOps(walletAddress, null, callData, false, {
    walletPrivKey: alicePrivateKey,
    coordinatorPublicKey,
    coordinatorPrivateKey
  })
  await tx.wait()

  await getBalances(walletAddress)
}

init()
