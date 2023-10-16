const {
  initAddresses,
  isAlreadyDeployed,
  composeInitCode,
  fundContractsAndAddresses,
  executeHandleOps,
  getBalances
} = require("./lib")

async function init() {
  const {
    walletAddress,
    alicePublicKey,
    alicePrivateKey,
    coordinatorPublicKey,
    coordinatorPrivateKey
  } = await initAddresses()

  if (await isAlreadyDeployed(walletAddress)) {
    console.error("Wallet already constructed:", walletAddress)
    return
  }

  await fundContractsAndAddresses(
    alicePublicKey,
    walletAddress,
    alicePrivateKey,
    coordinatorPrivateKey
  )
  await getBalances(walletAddress)

  const initCode = await composeInitCode(alicePublicKey)
  const tx = await executeHandleOps(walletAddress, initCode, null, true, {
    walletPrivKey: alicePrivateKey,
    coordinatorPublicKey,
    coordinatorPrivateKey
  })
  await tx.wait()

  await getBalances(walletAddress)
}

init()
